import json
import logging
from typing import Optional, List as PyList

import requests # Added for n8n API calls
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from whoosh.qparser import QueryParser, MultifieldParser, DEFAULT_OPERATOR

from app.models.api_models import WorkflowBase, WorkflowDetail, PaginatedWorkflows, N8NImportRequest, N8NImportResponse # Added N8N models
from app.models.workflow import Workflow as DBWorkflow # SQLAlchemy model, aliased to avoid confusion
from app.api.utils import get_db
from app.services.search_service import get_index

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

router = APIRouter()

def parse_json_field(json_string: Optional[str], default_value: Optional[PyList] = None) -> PyList:
    """Safely parses a JSON string field to a list, returning default if None or error."""
    if default_value is None:
        default_value = []
    if json_string is None:
        return default_value
    try:
        return json.loads(json_string)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse JSON string: {json_string}", exc_info=True)
        return default_value

def db_workflow_to_workflow_base(db_wf: DBWorkflow) -> WorkflowBase:
    """Converts a SQLAlchemy Workflow object to a Pydantic WorkflowBase object."""
    return WorkflowBase(
        id=db_wf.id,
        name=db_wf.name,
        description=db_wf.description,
        category=db_wf.category,
        nodes_summary=parse_json_field(db_wf.nodes_summary),
        tags=parse_json_field(db_wf.tags),
        source_path=db_wf.source_path
    )

def db_workflow_to_workflow_detail(db_wf: DBWorkflow) -> WorkflowDetail:
    """Converts a SQLAlchemy Workflow object to a Pydantic WorkflowDetail object."""
    raw_json_dict = {}
    if db_wf.raw_json:
        try:
            raw_json_dict = json.loads(db_wf.raw_json)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse raw_json for workflow ID {db_wf.id}", exc_info=True)
            # Return as empty dict or handle error as appropriate for your application
            # For now, if raw_json is invalid, it's treated as empty.
    
    return WorkflowDetail(
        id=db_wf.id,
        name=db_wf.name,
        description=db_wf.description,
        category=db_wf.category,
        nodes_summary=parse_json_field(db_wf.nodes_summary),
        tags=parse_json_field(db_wf.tags),
        source_path=db_wf.source_path,
        raw_json=raw_json_dict,
        created_at=db_wf.created_at,
        updated_at=db_wf.updated_at
    )


@router.get("/templates", response_model=PaginatedWorkflows)
def list_or_search_workflows(
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    size: int = 20,
):
    logger.info(f"GET /templates called with search='{search}', category='{category}', page={page}, size={size}")
    if page < 1: page = 1
    if size < 1: size = 20
    if size > 100: size = 100 # Max size limit

    items = []
    total_hits = 0

    if search:
        logger.info(f"Performing Whoosh search for: '{search}'")
        try:
            ix = get_index()
            # Fields to search in Whoosh. Adjust weights (^) as needed.
            # Example: name^2.0 means name is twice as important as other fields.
            search_fields = ["name", "description", "nodes_summary", "tags", "category"]
            # Using OR to make search broader. Use AND for more restrictive search.
            query_parser = MultifieldParser(search_fields, schema=ix.schema, group=DEFAULT_OPERATOR) # DEFAULT_OPERATOR is OR by default
            
            parsed_query = query_parser.parse(search)
            logger.debug(f"Parsed Whoosh query: {parsed_query}")

            with ix.searcher() as searcher:
                results = searcher.search_page(parsed_query, pagenum=page, pagelen=size)
                total_hits = len(results) # Total results found by Whoosh for this query
                logger.info(f"Whoosh search found {total_hits} total hits for query '{search}'. Page {page} shows up to {size} items.")

                if results:
                    workflow_ids = [hit['id'] for hit in results]
                    # Fetch corresponding workflows from DB
                    # Ensure IDs from Whoosh (strings) are correctly typed for DB query if necessary (here, model ID is int)
                    # Whoosh stores ID as string, DBWorkflow.id is Integer. Conversion handled by SQLAlchemy.
                    db_workflows = db.query(DBWorkflow).filter(DBWorkflow.id.in_(workflow_ids)).all()
                    
                    # Maintain order from search results if important
                    # This simple mapping assumes IDs are unique and sufficient
                    workflow_map = {str(wf.id): wf for wf in db_workflows}
                    ordered_db_workflows = [workflow_map[wf_id] for wf_id in workflow_ids if wf_id in workflow_map]

                    items = [db_workflow_to_workflow_base(wf) for wf in ordered_db_workflows]
                else:
                    logger.info(f"No results from Whoosh for query: '{search}' on page {page}")
            
        except Exception as e:
            logger.error(f"Error during Whoosh search: {e}", exc_info=True)
            # Fallback to empty result or re-raise, depending on desired behavior
            # For now, return empty list of items on search error.
            items = []
            total_hits = 0 # Reset total_hits as search failed or yielded no results
            # Optionally, raise HTTPException(status_code=500, detail="Search service error")

    else:
        logger.info("Performing DB query for listing/filtering.")
        query = db.query(DBWorkflow)
        if category:
            logger.info(f"Filtering by category: {category}")
            query = query.filter(DBWorkflow.category == category)

        total_hits = query.count()
        logger.info(f"DB query found {total_hits} total workflows for category '{category}'.")
        
        db_workflows = query.order_by(DBWorkflow.updated_at.desc()).offset((page - 1) * size).limit(size).all()
        items = [db_workflow_to_workflow_base(wf) for wf in db_workflows]

    return PaginatedWorkflows(
        total=total_hits,
        page=page,
        size=len(items), # Actual number of items returned, might be less than requested `size` on last page
        items=items,
    )


@router.get("/templates/{template_id}", response_model=WorkflowDetail)
def get_workflow_by_id(template_id: int, db: Session = Depends(get_db)):
    logger.info(f"GET /templates/{template_id} called.")
    
    db_workflow = db.query(DBWorkflow).filter(DBWorkflow.id == template_id).first()
    
    if not db_workflow:
        logger.warning(f"Workflow with ID {template_id} not found in database.")
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    logger.info(f"Workflow with ID {template_id} found: {db_workflow.name}")
    
    try:
        workflow_detail = db_workflow_to_workflow_detail(db_workflow)
        return workflow_detail
    except Exception as e:
        logger.error(f"Error converting workflow ID {template_id} to detail model: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error processing workflow data")

# Placeholder for future N8NImportRequest related endpoint (if needed by another subtask)
# from app.models.api_models import N8NImportRequest, N8NImportResponse
# @router.post("/templates/import_to_n8n", response_model=N8NImportResponse) # Original placeholder
# async def import_template_to_n8n(import_request: N8NImportRequest, db: Session = Depends(get_db)): # Original placeholder
#     # Logic for this endpoint will be developed in a separate subtask # Original placeholder
#     pass # Original placeholder

@router.post("/templates/import_to_n8n", response_model=N8NImportResponse)
async def import_template_to_n8n(payload: N8NImportRequest, db: Session = Depends(get_db)):
    logger.info(f"POST /templates/import_to_n8n called for template ID: {payload.template_id} to instance: {payload.n8n_instance_url}")

    # Fetch Workflow from DB
    workflow_data = db.query(DBWorkflow).filter(DBWorkflow.id == payload.template_id).first()
    if not workflow_data:
        logger.warning(f"Template ID {payload.template_id} not found in local database.")
        return N8NImportResponse(success=False, message="Template not found in local storage.")

    logger.info(f"Found template: {workflow_data.name} (ID: {workflow_data.id})")

    # Prepare Payload for n8n API
    try:
        full_template_json = json.loads(workflow_data.raw_json)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse raw_json for template ID {payload.template_id}. raw_json: {workflow_data.raw_json[:200]}...") # Log snippet
        return N8NImportResponse(success=False, message="Error parsing stored template data.")

    # The actual workflow to be imported is likely nested.
    # Common n8n structure: the main workflow definition is under a 'workflow' key,
    # or the root object itself contains 'nodes' and 'connections'.
    # Adjust if your stored raw_json has a different structure.
    # For n8n API (e.g. /api/v1/workflows), usually you send the content of the "workflow" object.
    # which means the object that has "nodes", "connections", "settings", etc.
    
    n8n_workflow_payload = None
    if 'workflow' in full_template_json and isinstance(full_template_json['workflow'], dict):
        # Case 1: raw_json is like {"id": "...", "name": "...", "workflow": {nodes:[...], connections:[...]}}
        n8n_workflow_payload = full_template_json['workflow']
        logger.debug("Using 'workflow' key from raw_json as n8n payload.")
    elif 'nodes' in full_template_json and 'connections' in full_template_json:
        # Case 2: raw_json is already the workflow object itself {nodes:[...], connections:[...]}
        n8n_workflow_payload = full_template_json
        logger.debug("Using raw_json directly as n8n payload (assuming it's the workflow object).")
    else:
        logger.error(f"Could not find 'workflow' object or 'nodes'/'connections' in raw_json for template ID {payload.template_id}.")
        return N8NImportResponse(success=False, message="Stored template data is not in the expected format.")

    # Ensure the payload is not empty
    if not n8n_workflow_payload.get('nodes'): # Nodes are essential
        logger.error(f"Prepared n8n payload for template ID {payload.template_id} has no nodes.")
        return N8NImportResponse(success=False, message="Prepared template payload is empty or invalid (missing nodes).")


    # Call n8n Instance API
    # The endpoint for creating/importing workflows in n8n is typically POST /api/v1/workflows
    target_url = f"{payload.n8n_instance_url.rstrip('/')}/api/v1/workflows"
    headers = {
        "X-N8N-API-KEY": payload.n8n_api_key,
        "Content-Type": "application/json"
    }

    logger.info(f"Attempting to import workflow to n8n instance at: {target_url}")
    logger.debug(f"Payload being sent to n8n: {json.dumps(n8n_workflow_payload)[:500]}...") # Log snippet of payload

    try:
        response = requests.post(target_url, headers=headers, json=n8n_workflow_payload, timeout=30)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        imported_n8n_workflow = response.json()
        # n8n's create workflow API usually returns the full created workflow object which includes its new 'id'.
        # Example response structure: { "id": "new_workflow_id", "name": "...", ... other fields ...}
        n8n_wf_id = imported_n8n_workflow.get('id')
        
        if not n8n_wf_id:
            logger.error(f"n8n API response for template import did not contain an 'id'. Response: {imported_n8n_workflow}")
            return N8NImportResponse(
                success=False,
                message="Workflow might have been imported, but n8n API response did not include a workflow ID."
            )

        # Construct a potential URL to the new workflow in the n8n instance
        n8n_wf_url = f"{payload.n8n_instance_url.rstrip('/')}/workflow/{n8n_wf_id}"

        logger.info(f"Workflow '{workflow_data.name}' imported successfully to {payload.n8n_instance_url}. New n8n ID: {n8n_wf_id}")
        return N8NImportResponse(
            success=True,
            message=f"Workflow '{workflow_data.name}' imported successfully to {payload.n8n_instance_url}.",
            n8n_workflow_id=str(n8n_wf_id),
            n8n_workflow_url=n8n_wf_url
        )
    except requests.exceptions.HTTPError as e:
        error_message = f"Failed to import workflow. n8n API at {target_url} returned status {e.response.status_code}."
        try:
            error_details = e.response.json()
            # n8n error often has: { "status": "error", "message": "details..." }
            # or { "code": X, "message": "details...", "hint": "...", "documentationUrl": "..."}
            error_message += f" Details: {error_details.get('message', str(error_details))}"
        except ValueError:
            error_message += f" Details: {e.response.text}"
        logger.error(error_message, exc_info=True)
        return N8NImportResponse(success=False, message=error_message)
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to n8n instance failed: {e}", exc_info=True)
        return N8NImportResponse(success=False, message=f"Request to n8n instance at {target_url} failed: {str(e)}")
    except json.JSONDecodeError as e: # If response.json() fails
        logger.error(f"Failed to decode JSON response from n8n API: {e}", exc_info=True)
        return N8NImportResponse(success=False, message=f"Failed to decode JSON response from n8n API: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during n8n import process for template ID {payload.template_id}: {e}", exc_info=True)
        return N8NImportResponse(success=False, message=f"An unexpected error occurred: {str(e)}")
