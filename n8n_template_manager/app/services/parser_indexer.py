import json
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.database import engine, SessionLocal, create_db_and_tables
from app.models.workflow import Workflow
from app.services.search_service import index_workflow # Import for Whoosh indexing

# 1. Initial Setup
# Ensure database and tables are created
create_db_and_tables()

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 2. Core Parsing Logic
def process_workflow_file(filepath: Path, db: Session):
    """
    Parses a single workflow JSON file and ingests its data into the database.
    """
    try:
        logger.info(f"Processing file: {filepath}")
        raw_json_content = filepath.read_text(encoding='utf-8')
        workflow_data = json.loads(raw_json_content)

        # Extract top-level workflow metadata (adjust keys if n8n output is different)
        # Assuming the actual workflow data is nested under a key, e.g. 'workflow' or directly at root
        # For this example, let's assume the relevant data is directly accessible
        # or under a generic 'workflow_details' key if not at root.
        
        # Adjust these paths based on the actual structure of your n8n JSON files
        # Example: workflow_id = workflow_data.get('id') or workflow_data.get('workflow', {}).get('id')

        workflow_id = workflow_data.get('id')
        if not workflow_id:
            # Newer n8n versions might not have a top-level ID for the *template* itself,
            # but rather for the workflow structure within.
            # If an explicit top-level 'id' for the template is not present,
            # we might need to generate one or use a hash of the content,
            # or decide that an ID is only relevant for the *workflow instance*
            # not the template. For now, let's try to find it or skip.
            # This part might need adjustment based on n8n's JSON structure.
            # Let's assume for now that 'id' is a direct child of the root object.
             logger.warning(f"Skipping file {filepath}: Missing 'id' in workflow data.")
             return


        # Check for duplicates
        existing_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if existing_workflow:
            logger.warning(f"Workflow with ID {workflow_id} from file {filepath} already exists. Skipping.")
            return

        name = workflow_data.get('name', "Untitled Workflow")
        description = workflow_data.get('description', "")
        category = filepath.parent.name
        
        # Nodes summary
        nodes_summary_list = []
        # Corrected path to nodes: workflow_data -> 'workflow' (key) -> 'nodes' (list)
        workflow_nodes = workflow_data.get('workflow', {}).get('nodes', [])
        if not workflow_nodes and 'nodes' in workflow_data: # Fallback if 'nodes' is at root
            workflow_nodes = workflow_data.get('nodes', [])

        for node in workflow_nodes:
            node_type = node.get('type')
            if node_type and node_type not in nodes_summary_list:
                nodes_summary_list.append(node_type)
        
        nodes_summary_json = json.dumps(sorted(list(set(nodes_summary_list))))
        
        # Tags - initially just the category
        tags_json = json.dumps([category])

        workflow_entry = Workflow(
            id=workflow_id,
            name=name,
            description=description,
            source_path=str(filepath),
            category=category,
            raw_json=raw_json_content,
            nodes_summary=nodes_summary_json,
            tags=tags_json
        )

        db.add(workflow_entry)
        db.commit()
        logger.info(f"Successfully added workflow ID {workflow_id} ('{name}') to database from {filepath}")

        # After successful DB commit, index the workflow
        try:
            logger.info(f"Attempting to index workflow ID {workflow_id} ('{name}')")
            index_workflow(workflow_entry)
            logger.info(f"Successfully indexed workflow ID {workflow_id} ('{name}')")
        except Exception as e:
            logger.error(f"Error indexing workflow ID {workflow_id} ('{name}') from {filepath}: {e}", exc_info=True)
            # Decide if this should be a critical error or just logged
            # For now, we log and continue, as the data is in the DB.

    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON from file: {filepath}", exc_info=True)
    except KeyError as e:
        logger.error(f"Missing key {e} in workflow data for file: {filepath}", exc_info=True)
    except Exception as e:
        logger.error(f"An unexpected error occurred while processing file {filepath}: {e}", exc_info=True)


# 3. Main Scanning Logic
def scan_and_ingest_workflows(base_directory: str):
    """
    Scans a directory for n8n workflow JSON files and processes them.
    """
    base_path = Path(base_directory)
    if not base_path.is_dir():
        logger.error(f"Base directory {base_directory} does not exist or is not a directory.")
        return

    logger.info(f"Starting scan in directory: {base_directory}")
    json_files = list(base_path.rglob('*.json'))
    
    file_count = len(json_files)
    processed_count = 0
    skipped_count = 0

    if not json_files:
        logger.info("No JSON files found in the specified directory.")
        return

    logger.info(f"Found {file_count} JSON files to process.")

    for filepath in json_files:
        db_session: Session = SessionLocal()
        try:
            # We need to re-check for workflow_id presence inside process_workflow_file
            # or refine how IDs are handled if they are not consistently present.
            # For now, process_workflow_file handles logging for missing IDs.
            process_workflow_file(filepath, db_session)
            # Assuming process_workflow_file now correctly determines if a file was fully processed or skipped
            # This logic might need refinement based on return values from process_workflow_file
            # For simplicity, we'll increment processed_count if no exception occurs here.
            # A more robust way would be for process_workflow_file to return a status.
            processed_count +=1 # This counts attempts; actual additions are logged by process_workflow_file
        except Exception as e:
            logger.error(f"Failed to process or commit session for {filepath}: {e}", exc_info=True)
            skipped_count += 1 # Or handle based on process_workflow_file's outcome
        finally:
            db_session.close()
            
    # Note: The current processed_count includes files that might have been skipped due to duplicates or missing IDs.
    # A more accurate count of "successfully added" items would require process_workflow_file to return a status.
    # The logs from process_workflow_file give detailed info on skips/adds.
    logger.info(f"Scan complete. Attempted to process {processed_count} files.")
    # To get a more precise "skipped" count, it might be better to count successful additions inside process_workflow_file
    # and sum them up here, or have process_workflow_file return True on success, False on skip/fail.
    # For now, the logs provide this detail.


# 4. Execution Block
import os # Added for environment variable access

if __name__ == "__main__":
    # Check for Docker-specific environment variable for workflow directory
    docker_workflow_dir_env = os.getenv("DOCKER_WORKFLOW_DIR")
    
    if docker_workflow_dir_env:
        WORKFLOW_DIR = docker_workflow_dir_env
        logger.info(f"Running in Docker mode. Using DOCKER_WORKFLOW_DIR: {WORKFLOW_DIR}")
    else:
        # Default path assuming script is in n8n_template_manager/app/services/
        # and workflows are in ../../workflows/n8n-templates-sorted/ relative to project root
        WORKFLOW_DIR = str(Path(__file__).resolve().parent.parent.parent / "workflows" / "n8n-templates-sorted")
        logger.info(f"Not running in Docker mode (DOCKER_WORKFLOW_DIR not set). Using default WORKFLOW_DIR: {WORKFLOW_DIR}")

    logger.info(f"Final base workflow directory set to: {WORKFLOW_DIR}")
    
    # Check if the directory exists before starting
    if not Path(WORKFLOW_DIR).is_dir():
        logger.error(f"The specified workflow directory does not exist: {WORKFLOW_DIR}")
        logger.error("Please ensure the 'workflows/n8n-templates-sorted' directory is correctly "
                     "placed relative to the project root or update WORKFLOW_DIR.")
    else:
        scan_and_ingest_workflows(WORKFLOW_DIR)
        logger.info("Workflow ingestion process finished.")
