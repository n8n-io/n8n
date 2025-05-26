import json
import logging
import pathlib
import re
import time
import requests
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, create_db_and_tables
from app.models.workflow import Workflow
from app.services.search_service import index_workflow

# --- Configuration (adapted from n8n_download.py) ---
API_BASE_URL = "https://n8n.io/api/workflows"
SEARCH_ENDPOINT = f"{API_BASE_URL}/"  # Note: original was /templates, but n8n.io/api/workflows/ seems to list them
WORKFLOW_ENDPOINT_TEMPLATE = f"{API_BASE_URL}/{{wf_id}}" # Original: https://n8n.io/api/workflows/{id}

PER_PAGE = 50  # Number of results per page
SLEEP_DURATION = 1  # Seconds to sleep between requests
REQUEST_TIMEOUT = 30  # Seconds for request timeout
USER_AGENT = "n8n-Template-Manager-Fetcher/1.0"

# Keywords to categorize workflows.
# The key is the keyword (regex pattern), the value is the folder name (category).
KEYWORD_FOLDERS = {
    r"(?i)google sheet": "Google Sheets",
    r"(?i)airtable": "Airtable",
    r"(?i)aws": "AWS",
    r"(?i)s3": "AWS",
    r"(?i)lambda": "AWS",
    r"(?i)dynamodb": "AWS",
    r"(?i)slack": "Slack",
    r"(?i)discord": "Discord",
    r"(?i)telegram": "Telegram",
    r"(?i)openai": "OpenAI",
    r"(?i)chatgpt": "OpenAI",
    r"(?i)gpt-3": "OpenAI",
    r"(?i)gpt-4": "OpenAI",
    r"(?i)anthropic": "Anthropic",
    r"(?i)claude": "Anthropic",
    r"(?i)hubspot": "HubSpot",
    r"(?i)salesforce": "Salesforce",
    r"(?i)sendgrid": "SendGrid",
    r"(?i)twilio": "Twilio",
    r"(?i)typeform": "Typeform",
    r"(?i)calendly": "Calendly",
    r"(?i)shopify": "Shopify",
    r"(?i)woocommerce": "WooCommerce",
    r"(?i)stripe": "Stripe",
    r"(?i)paypal": "PayPal",
    r"(?i)github": "GitHub",
    r"(?i)gitlab": "GitLab",
    r"(?i)jira": "Jira",
    r"(?i)trello": "Trello",
    r"(?i)asana": "Asana",
    r"(?i)notion": "Notion",
    r"(?i)mqtt": "MQTT",
    r"(?i)kafka": "Kafka",
    r"(?i)postgres": "PostgreSQL",
    r"(?i)mysql": "MySQL",
    r"(?i)mongodb": "MongoDB",
    r"(?i)vector": "Vector Database",
    r"(?i)pinecone": "Vector Database",
    r"(?i)weaviate": "Vector Database",
    r"(?i)qdrant": "Vector Database",
    r"(?i)redis": "Redis",
    r"(?i)data sync": "Data Synchronization",
    r"(?i)etl": "ETL",
    r"(?i)automation": "General Automation",
    r"(?i)webhook": "Webhooks",
    r"(?i)http request": "HTTP",
    r"(?i)api": "API Integration",
    r"(?i)scrape": "Web Scraping",
    r"(?i)parse": "Data Parsing",
    r"(?i)xml": "XML",
    r"(?i)csv": "CSV",
    r"(?i)json": "JSON",
    r"(?i)data mapping": "Data Mapping",
    r"(?i)file manag": "File Management", # "file management", "file manager"
    r"(?i)image process": "Image Processing",
    r"(?i)customer support": "Customer Support",
    r"(?i)ticket": "Customer Support",
    r"(?i)lead gen": "Lead Generation",
    r"(?i)marketing": "Marketing",
    r"(?i)email": "Email",
    r"(?i)crm": "CRM",
    r"(?i)erp": "ERP",
    r"(?i)devops": "DevOps",
    r"(?i)ci/cd": "DevOps",
    r"(?i)backup": "Backup",
    r"(?i)monitor": "Monitoring",
    r"(?i)alert": "Alerting",
    r"(?i)scheduling": "Scheduling",
    r"(?i)rss": "RSS",
    r"(?i)social media": "Social Media",
    r"(?i)twitter": "Social Media",
    r"(?i)facebook": "Social Media",
    r"(?i)linkedin": "Social Media",
    r"(?i)instagram": "Social Media",
    r"(?i)youtube": "Social Media",
    r"(?i)utility": "Utilities",
    r"(?i)helper": "Utilities",
    r"(?i)tool": "Utilities",
    r"(?i)example": "Examples",
    r"(?i)template": "Templates",
    r"(?i)tutorial": "Tutorials",
    r"(?i)demo": "Demos",
    r"(?i)test": "Testing",
    # Add more keywords and categories as needed
}
# If true, saves the workflow in multiple folders if it matches multiple keywords.
# If false, it saves in the first matched keyword's folder.
SAVE_IN_MULTIPLE_FOLDERS = True # For this service, tags will handle multiple categories. Category will be the first match or a default.
UNCATEGORIZED_FOLDER_NAME = "Uncategorized"


# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
        # If you want to log to a file:
        # logging.FileHandler("online_fetcher.log")
    ]
)
logger = logging.getLogger(__name__)

# --- Helper Functions ---
def sanitize_category_name(name: str) -> str:
    """
    Sanitizes a string to be suitable as a category name.
    Replaces spaces and special characters with underscores, converts to lowercase.
    """
    name = name.lower()
    name = re.sub(r"\s+", "_", name)
    name = re.sub(r"[^a-z0-9_-]", "", name)
    return name.strip("_")

# --- Core Processing Logic ---
def process_and_store_workflow(wf_json_data: dict, categories: list[str], db: Session) -> bool:
    """
    Processes fetched workflow JSON data and stores it in the database.
    """
    try:
        workflow_id = wf_json_data.get('id')
        if not workflow_id:
            logger.error("Workflow data is missing 'id'. Skipping.")
            return False

        # Duplicate Check
        existing_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if existing_workflow:
            logger.info(f"Workflow with ID {workflow_id} (Name: {existing_workflow.name}) already exists. Skipping.")
            return False # Or True if skipping is considered a "handled" case

        name = wf_json_data.get('name', "Untitled Workflow")
        description = wf_json_data.get('description', "")
        raw_json_content = json.dumps(wf_json_data)
        
        # Nodes summary
        nodes_summary_list = []
        workflow_actual = wf_json_data.get('workflow', {}) # The actual workflow definition is nested
        workflow_nodes = workflow_actual.get('nodes', [])
        for node in workflow_nodes:
            node_type = node.get('type')
            if node_type and node_type not in nodes_summary_list:
                nodes_summary_list.append(node_type)
        nodes_summary_json = json.dumps(sorted(list(set(nodes_summary_list))))
        
        primary_category = categories[0] if categories else sanitize_category_name(UNCATEGORIZED_FOLDER_NAME)
        # Ensure all category names are sanitized for tags
        tags_list = sorted(list(set(sanitize_category_name(cat) for cat in categories)))
        if not tags_list and primary_category != sanitize_category_name(UNCATEGORIZED_FOLDER_NAME):
             tags_list.append(primary_category) # Add primary if no other tags from keywords
        elif not tags_list and primary_category == sanitize_category_name(UNCATEGORIZED_FOLDER_NAME):
             tags_list.append(sanitize_category_name(UNCATEGORIZED_FOLDER_NAME))


        tags_json = json.dumps(tags_list)
        
        source_path_url = f"api://n8n.io/templates/{workflow_id}"

        workflow_entry = Workflow(
            id=workflow_id,
            name=name,
            description=description,
            source_path=source_path_url,
            category=primary_category,
            raw_json=raw_json_content,
            nodes_summary=nodes_summary_json,
            tags=tags_json
        )

        db.add(workflow_entry)
        db.commit()
        logger.info(f"Successfully added workflow ID {workflow_id} ('{name}') to database.")

        # Index the newly added workflow
        try:
            logger.info(f"Attempting to index workflow ID {workflow_id} ('{name}')")
            index_workflow(workflow_entry) # workflow_entry is the SQLAlchemy model instance
            logger.info(f"Successfully indexed workflow ID {workflow_id} ('{name}')")
        except Exception as e:
            logger.error(f"Error indexing workflow ID {workflow_id} ('{name}'): {e}", exc_info=True)
            # Non-fatal, already in DB.

        return True

    except KeyError as e:
        logger.error(f"Missing key {e} in workflow data: {json.dumps(wf_json_data)[:200]}...", exc_info=True)
    except Exception as e:
        logger.error(f"An unexpected error occurred while processing workflow: {e}", exc_info=True)
    
    return False


# --- Main Fetching Logic ---
def fetch_and_process_all_templates():
    """
    Fetches all workflow templates from the n8n.io API and processes them.
    """
    logger.info("Starting fetch and process for all n8n templates.")
    create_db_and_tables() # Ensure DB schema is ready

    http_session = requests.Session()
    http_session.headers.update({"User-Agent": USER_AGENT})

    page = 1
    total_downloaded = 0
    total_skipped = 0
    total_errors = 0
    keep_fetching = True

    while keep_fetching:
        logger.info(f"Fetching page {page} of workflow templates...")
        try:
            # The n8n.io API for workflows seems to be at /api/workflows without /templates
            # and uses query parameters like 'page', 'limit', 'query' (for search term)
            # For listing, let's try basic pagination.
            # The API might also use cursor-based pagination or other params.
            # This is a guess based on typical API patterns and original script's SEARCH_ENDPOINT.
            # The actual API endpoint and parameters might need adjustment.
            # Example: response = http_session.get(SEARCH_ENDPOINT, params={"page": page, "limit": PER_PAGE, "include": "workflow"}, timeout=REQUEST_TIMEOUT)
            # For now, assuming the structure is similar to what the old script expected from /templates endpoint.
            # The provided SEARCH_ENDPOINT = "https://n8n.io/api/workflows/" might return a list of workflows directly.
            # Let's assume it returns a structure like: {"data": [workflow_meta_1, ...], "meta": {"nextPage": ...}} or similar
            
            # The actual API at https://n8n.io/api/workflows/ does not seem to support simple pagination like page=x
            # It seems to return ALL workflows in one go, or requires specific filtering.
            # For this exercise, let's assume the API structure is:
            # { "data": [ { "id": "...", "name": "...", "description": "...", ... other meta fields ... }, ... ],
            #   "meta": { "pagination": { "page": 1, "pageSize": 50, "pageCount": X, "total": Y } } }
            # This is a common pattern. If the actual API is different, this part needs to be adapted.
            # Given the original script's structure, it implies a paginated search.
            # Let's simulate this by fetching all and then "paginating" locally for the test, or assume a compatible endpoint.
            
            # For the purpose of this task, I will assume SEARCH_ENDPOINT returns a list of workflow metadata objects
            # and that I need to fetch the full workflow JSON separately.
            # If SEARCH_ENDPOINT itself provides full JSONs, then the second fetch isn't needed.

            # Let's try to access the API as the original script might have intended, expecting a list of templates.
            # The /api/workflows endpoint seems to list user's own workflows if authenticated.
            # Public templates are usually under a specific "community" or "templates" path.
            # The original n8n_download.py used "https://n8n.io/api/templates" with query params.
            # Let's revert SEARCH_ENDPOINT to that, as it's more likely for public templates.
            
            # Re-adjusting based on n8n_download.py's original intent
            current_search_endpoint = "https://n8n.io/api/templates" # More plausible for public templates
            
            response = http_session.get(
                current_search_endpoint,
                params={"page": page, "pageSize": PER_PAGE, "categories": "all"}, # Example params, might need adjustment
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            page_data = response.json()
            
            # Assuming page_data is a dict with 'data' (list of wf_meta) and 'meta' (for pagination)
            workflows_on_page = page_data.get("data", [])
            if not workflows_on_page:
                logger.info("No more workflows found on this page or end of results.")
                keep_fetching = False
                break

            logger.info(f"Found {len(workflows_on_page)} workflows on page {page}.")

            for wf_meta in workflows_on_page:
                wf_id = wf_meta.get('id')
                if not wf_id:
                    logger.warning("Found workflow metadata without an ID. Skipping.")
                    total_skipped += 1
                    continue

                logger.info(f"Processing workflow ID: {wf_id}, Name: {wf_meta.get('name')}")

                # Determine categories based on keywords
                text_to_search = f"{wf_meta.get('name', '')} {wf_meta.get('description', '')}"
                matched_categories = []
                for keyword, folder_name in KEYWORD_FOLDERS.items():
                    if re.search(keyword, text_to_search):
                        matched_categories.append(folder_name)
                
                if not matched_categories:
                    # If no keywords matched, assign to Uncategorized or skip
                    # For now, let's assign to Uncategorized.
                    matched_categories.append(UNCATEGORIZED_FOLDER_NAME)
                    logger.debug(f"Workflow ID {wf_id} did not match any keywords. Assigning to '{UNCATEGORIZED_FOLDER_NAME}'.")
                
                # Sanitize all matched categories before use
                matched_categories = [sanitize_category_name(cat) for cat in matched_categories]
                if not SAVE_IN_MULTIPLE_FOLDERS and len(matched_categories) > 1:
                    matched_categories = [matched_categories[0]] # Use only the first match


                # Fetch the full workflow JSON
                full_wf_url = WORKFLOW_ENDPOINT_TEMPLATE.format(wf_id=wf_id)
                try:
                    logger.debug(f"Fetching full workflow from: {full_wf_url}")
                    wf_response = http_session.get(full_wf_url, timeout=REQUEST_TIMEOUT)
                    wf_response.raise_for_status()
                    full_wf_json = wf_response.json()
                except requests.RequestException as e:
                    logger.error(f"Error fetching full workflow for ID {wf_id} from {full_wf_url}: {e}")
                    total_errors += 1
                    continue # Skip to next workflow

                db: Session = SessionLocal()
                try:
                    if process_and_store_workflow(full_wf_json, matched_categories, db):
                        total_downloaded += 1
                    else:
                        # process_and_store_workflow logs skips due to duplicates or processing errors
                        total_skipped +=1 # Counting skips from process_and_store_workflow
                except Exception as e_proc:
                    logger.error(f"Critical error during DB processing for workflow ID {wf_id}: {e_proc}", exc_info=True)
                    total_errors +=1
                finally:
                    db.close()
                
                time.sleep(SLEEP_DURATION) # Be respectful to the API

            # Pagination logic (assuming 'meta' part of response tells us if there's a next page)
            # Example: if not page_data.get("meta", {}).get("nextPage"):
            # For n8n.io/api/templates, it might be `page_data.get("meta", {}).get("hasNextPage")`
            # or checking if `len(workflows_on_page) < PER_PAGE`
            meta_info = page_data.get("meta", {})
            if "hasNextPage" in meta_info and not meta_info["hasNextPage"]:
                keep_fetching = False
            elif "pagination" in meta_info: # Another common pattern
                 pagination_info = meta_info["pagination"]
                 if pagination_info.get("page", page) >= pagination_info.get("pageCount", page):
                     keep_fetching = False
            elif len(workflows_on_page) < PER_PAGE : # Fallback if no explicit next page indicator
                 keep_fetching = False


            if keep_fetching:
                page += 1
            else:
                 logger.info("Reached the end of workflow templates.")

        except requests.RequestException as e:
            logger.error(f"API request failed for page {page}: {e}. Stopping.")
            total_errors += 1
            keep_fetching = False # Stop fetching on critical API errors
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON response for page {page}: {e}. Stopping.")
            total_errors += 1
            keep_fetching = False
        except Exception as e:
            logger.error(f"An unexpected error occurred during fetching loop for page {page}: {e}", exc_info=True)
            total_errors += 1
            keep_fetching = False # Stop on other critical errors


    logger.info("--- Online Template Fetching Summary ---")
    logger.info(f"Total Workflows Processed (Downloaded & Stored): {total_downloaded}")
    logger.info(f"Total Workflows Skipped (Duplicates, No ID, etc.): {total_skipped}")
    logger.info(f"Total Errors (API Fetch, Processing): {total_errors}")
    logger.info("--------------------------------------")


# --- Execution Block ---
if __name__ == "__main__":
    logger.info("Starting online template fetcher script...")
    fetch_and_process_all_templates()
    logger.info("Online template fetcher script finished.")
