import os
import pathlib
import json
import logging
from whoosh.index import create_in, open_dir, exists_in
from whoosh.fields import Schema, TEXT, ID, KEYWORD, STORED
from whoosh.qparser import QueryParser

# Configure basic logging for search service
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
# Prevent duplicate logs if root logger is already configured
if not logger.hasHandlers():
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)


INDEX_DIR = pathlib.Path(__file__).resolve().parent.parent / "whoosh_index"

class WorkflowSchema(Schema):
    id = ID(stored=True, unique=True) # n8n's workflow ID (string)
    name = TEXT(stored=True, field_boost=2.0)
    description = TEXT(stored=True)
    category = KEYWORD(stored=True, scorable=True)
    nodes_summary = TEXT(stored=True) # Space-separated string of node types
    tags = KEYWORD(stored=True, scorable=True, commas=True) # Comma-separated string of tags
    source_path = STORED() # Path to the original JSON file

def get_index():
    """
    Opens an existing Whoosh index or creates a new one if it doesn't exist.
    """
    if not INDEX_DIR.exists():
        logger.info(f"Index directory {INDEX_DIR} not found. Creating new index.")
        os.makedirs(INDEX_DIR, exist_ok=True)
        ix = create_in(INDEX_DIR, WorkflowSchema)
        logger.info(f"New index created in {INDEX_DIR}")
    else:
        if not exists_in(INDEX_DIR, indexname="MAIN"): # Default index name is _MAIN_WRITELOCK or similar during write
             logger.warning(f"Index directory {INDEX_DIR} exists but no valid index found. Attempting to create.")
             # Potentially clean up or re-initialize if needed, for now, create_in should handle it.
             os.makedirs(INDEX_DIR, exist_ok=True) # Ensure dir exists
             ix = create_in(INDEX_DIR, WorkflowSchema)
        else:
            logger.info(f"Opening existing index from {INDEX_DIR}")
            ix = open_dir(INDEX_DIR)
    return ix

def add_workflow_to_index(writer, workflow_model_instance):
    """
    Adds a single workflow document to the Whoosh index.
    workflow_model_instance is an instance of the SQLAlchemy Workflow model.
    """
    try:
        # Ensure 'id' is a string for Whoosh ID field
        workflow_id_str = str(workflow_model_instance.id)

        # Convert nodes_summary (JSON list string) to space-separated string
        nodes_list = json.loads(workflow_model_instance.nodes_summary or "[]")
        nodes_text = " ".join(sorted(list(set(str(node) for node in nodes_list))))

        # Convert tags (JSON list string) to comma-separated string
        tags_list = json.loads(workflow_model_instance.tags or "[]")
        tags_text = ",".join(sorted(list(set(str(tag) for tag in tags_list))))
        
        writer.add_document(
            id=workflow_id_str,
            name=workflow_model_instance.name,
            description=workflow_model_instance.description,
            category=workflow_model_instance.category,
            nodes_summary=nodes_text,
            tags=tags_text,
            source_path=workflow_model_instance.source_path
        )
        logger.debug(f"Document prepared for indexing: ID {workflow_id_str}, Name: {workflow_model_instance.name}")
    except Exception as e:
        logger.error(f"Error preparing document for Whoosh index (ID: {workflow_model_instance.id}): {e}", exc_info=True)
        raise # Re-raise to be caught by index_workflow

def index_workflow(workflow_model_instance):
    """
    Gets the Whoosh index and indexes a single workflow model instance.
    """
    logger.info(f"Starting indexing for workflow ID: {workflow_model_instance.id}")
    try:
        ix = get_index()
        with ix.writer() as writer:
            add_workflow_to_index(writer, workflow_model_instance)
        logger.info(f"Successfully indexed workflow ID: {workflow_model_instance.id}, Name: {workflow_model_instance.name}")
    except Exception as e:
        logger.error(f"Failed to index workflow ID {workflow_model_instance.id}: {e}", exc_info=True)
        # Optionally, re-raise or handle as per application requirements
        # For now, just logging the error.

# Example Usage (for testing this module directly)
if __name__ == '__main__':
    logger.info("Running search_service.py directly for testing.")
    
    # Mock Workflow SQLAlchemy model instance for testing
    class MockWorkflow:
        def __init__(self, id, name, description, category, nodes_summary_json, tags_json, source_path):
            self.id = id
            self.name = name
            self.description = description
            self.category = category
            self.nodes_summary = nodes_summary_json # JSON string
            self.tags = tags_json # JSON string
            self.source_path = source_path

    # Ensure the index directory is clean for a fresh test
    if INDEX_DIR.exists():
        import shutil
        # shutil.rmtree(INDEX_DIR) # Be careful with this in a real environment
        logger.info(f"Test: Index directory {INDEX_DIR} exists. For a full test, remove it manually.")

    logger.info("Creating mock workflow instance...")
    mock_wf = MockWorkflow(
        id="test_workflow_123", # Assuming n8n IDs can be strings or are converted
        name="My Test Workflow",
        description="This is a detailed description of the test workflow.",
        category="Testing",
        nodes_summary_json='["n8n-nodes-base.httpRequest", "n8n-nodes-base.if"]',
        tags_json='["test", "example", "http"]',
        source_path="/path/to/workflow.json"
    )

    logger.info("Attempting to index mock workflow...")
    try:
        index_workflow(mock_wf)
        logger.info("Mock workflow indexing test completed.")
    except Exception as e:
        logger.error(f"Error during mock workflow indexing test: {e}", exc_info=True)

    # Test searching (optional, for more complete testing)
    try:
        ix = get_index()
        with ix.searcher() as searcher:
            query_parser = QueryParser("name", schema=ix.schema)
            query = query_parser.parse("Test Workflow")
            results = searcher.search(query)
            if results:
                logger.info(f"Found {len(results)} results for 'Test Workflow':")
                for hit in results:
                    logger.info(f"  ID: {hit['id']}, Name: {hit['name']}, Category: {hit['category']}")
            else:
                logger.info("No results found for 'Test Workflow'. This might be expected if index is new or if issues occurred.")
    except Exception as e:
        logger.error(f"Error during search test: {e}", exc_info=True)
