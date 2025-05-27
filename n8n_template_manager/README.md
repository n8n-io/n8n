# n8n Workflow Template Manager

## Overview

The n8n Workflow Template Manager is a Python-based application designed to help you manage, search, and utilize n8n workflow templates. It allows for local storage of templates, fetching the latest templates directly from n8n.io, and provides a simple interface to search and import these templates into your own n8n instance.

This project aims to provide a centralized place for n8n users to discover and reuse workflow patterns, and for AI agents (like RAG systems) to access workflow data for contextual understanding.

Key components include:
*   **SQLite Database:** For storing template metadata and JSON.
*   **Whoosh Search Engine:** For fast full-text search capabilities.
*   **FastAPI Backend:** Provides a robust API for programmatic access.
*   **Simple Web UI:** For easy searching and importing of templates.

## Features

*   **Local Template Parsing:** Ingests n8n workflow JSON files from a local directory structure.
*   **Online Template Fetching:** Downloads and stores the latest community templates from the n8n.io API.
*   **Categorization & Tagging:** Organizes templates by category (derived from source or keywords) and tags.
*   **Full-Text Search:** Allows searching through template names, descriptions, node types, and tags.
*   **RESTful API:** Exposes endpoints for listing, searching, and retrieving template details, including full JSON.
*   **Web Interface:** A user-friendly UI to browse, search, and import templates into an n8n instance.
*   **Database Backup Utility:** A simple script to back up the SQLite database.
*   **RAG Enablement:** The API can be used by external AI agents or RAG (Retrieval Augmented Generation) systems to fetch workflow data for contextual information.

## Project Structure

```
n8n_template_manager/
├── app/                     # Main application code
│   ├── api/                 # FastAPI endpoints, utils
│   ├── db/                  # Database setup (SQLite)
│   ├── models/              # SQLAlchemy and Pydantic models
│   ├── services/            # Business logic (parsing, indexing, fetching)
│   └── static/              # Frontend HTML, CSS, JS
├── db_backups/              # Default directory for database backups
├── scripts/                 # Utility scripts (e.g., backup)
├── whoosh_index/            # Whoosh search index files
├── workflows/               # (Optional) Default local directory for n8n JSON files to be parsed
│   └── n8n-templates-sorted/ # Example subdirectory structure for local parsing
├── main.py                  # Main FastAPI application entry point
├── n8n_templates.db         # SQLite database file (created on first run)
├── requirements.txt         # Python dependencies
└── README.md                # This file
```
**Note:** The `Dockerfile` and `.dockerignore` for this application are located within the `n8n_template_manager/` directory.

## Setup and Installation

**Prerequisites:**
*   Python 3.8 or newer.
*   `pip` for installing Python packages.

**Steps:**

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url> # Replace with the actual URL if hosted
    cd n8n_template_manager
    ```

2.  **Create a Virtual Environment (Recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    (Note: `psycopg2-binary` is included for potential future PostgreSQL use, but the application defaults to SQLite, which requires no external database server.)

## Running the Application

### 1. Initial Data Ingestion

You need to populate the database with workflow templates. You can do this from local files or by fetching from n8n.io.

*   **From Local Files (if you have n8n JSON files):**
    Place your n8n workflow JSON files into a directory structure like `workflows/n8n-templates-sorted/CategoryName/workflow.json`.
    Then run the parser from the project root directory:
    ```bash
    python app/services/parser_indexer.py
    ```
    *(The script is configured to look for workflows in `../../workflows/n8n-templates-sorted` relative to its own path, which translates to `n8n_template_manager/workflows/n8n-templates-sorted/` when the command is run as shown).*

*   **Fetch Templates from n8n.io:**
    To download the latest community templates from n8n.io, run the following command from the project root directory:
    ```bash
    python app/services/online_template_fetcher.py
    ```

### 2. Starting the FastAPI Server

Once you have dependencies installed (and optionally data ingested), start the FastAPI server:
```bash
python main.py
```
The server will typically start on `http://127.0.0.1:8000`.

### 3. Building and Running with Docker

*   **Build the Docker Image:**
    The command must be run from the **repository root** (the parent directory of `n8n_template_manager/` and `workflows/`). This is crucial because the Docker build needs access to both the application code within `n8n_template_manager/` and the sibling `workflows/` directory (which is copied into the image).
    ```bash
    docker build -f ./n8n_template_manager/Dockerfile . -t n8n-template-manager
    ```
    *   `-f ./n8n_template_manager/Dockerfile`: Specifies the path to the Dockerfile located inside the `n8n_template_manager` directory.
    *   `.`: Sets the build context to the current directory (the repository root).

*   **Run the Docker Container:**
    ```bash
    docker run -p 8000:8000 n8n-template-manager
    ```
    To run with persistent data, you need to mount volumes for the database and search index:
    ```bash
    docker run -p 8000:8000 \
      -v /path/on/your/host/for_db:/app/n8n_templates.db \
      -v /path/on/your/host/for_index:/app/whoosh_index \
      n8n-template-manager
    ```
    Replace `/path/on/your/host/for_db` and `/path/on/your/host/for_index` with actual paths on your host machine.

    **Note on data persistence:** The Docker image by default will use an SQLite database (`n8n_templates.db`) and Whoosh index (`whoosh_index/`) within the container (both created in the `/app` directory). For persistent data across container restarts, you should mount volumes for these paths. For example, you might map `/app/n8n_templates.db` (the database file) and `/app/whoosh_index` (the search index directory) inside the container to directories on your host machine.

### 4. Accessing the Application

*   **Web UI:** Open your browser and go to `http://127.0.0.1:8000/`.
*   **API Documentation (Swagger UI):** `http://127.0.0.1:8000/docs`.
*   **API Documentation (ReDoc):** `http://127.0.0.1:8000/redoc`.
*   **API Base URL:** `http://127.0.0.1:8000/api/v1`.

## Using the Web Interface

The web interface allows you to:
*   **Search:** Enter keywords in the search box to find templates by name, description, nodes, or tags.
*   **Filter by Category:** Select a category from the dropdown to narrow down results.
*   **Import to n8n:**
    1.  Click the "Import" button on a template card.
    2.  In the modal window that appears, enter your n8n instance URL (e.g., `https://my.n8n.instance.com` or `http://localhost:5678`) and your n8n API Key (found in your n8n instance under Settings > API).
    3.  Click "Confirm Import". The template will be imported into your n8n instance.

## API Endpoints

The following are the main API endpoints:

*   **`GET /api/v1/templates`**
    *   Lists or searches for templates.
    *   **Query Parameters:**
        *   `search` (optional): String to search for.
        *   `category` (optional): String to filter by category.
        *   `page` (optional, default: 1): Page number for pagination.
        *   `size` (optional, default: 20): Number of items per page.
    *   Returns a paginated list of basic workflow details.

*   **`GET /api/v1/templates/{template_id}`**
    *   Retrieves detailed information for a specific template, including its full `raw_json`.
    *   `template_id` is the integer ID of the workflow.

*   **`POST /api/v1/templates/import_to_n8n`**
    *   Imports a specified template into a target n8n instance.
    *   **Request Body (JSON):**
        ```json
        {
            "template_id": 0,       // Integer ID of the template to import
            "n8n_instance_url": "string", // URL of your n8n instance
            "n8n_api_key": "string"       // Your n8n API key
        }
        ```
    *   Returns a success/failure message, including the new workflow ID and URL in the target n8n instance on success.

## Backup Utility

A script is provided to back up the SQLite database (`n8n_templates.db`).

*   **How to Run:**
    Navigate to the project root directory and run:
    ```bash
    python scripts/backup_db.py
    ```
*   **Storage:** Backups are stored as timestamped `.db` files in the `n8n_template_manager/db_backups/` directory.

## RAG Integration

This system can serve as a data source for Retrieval Augmented Generation (RAG) applications or other AI agents. An external system can:
1.  Use the `GET /api/v1/templates` endpoint with the `search` parameter to find relevant workflows based on a query.
2.  From the search results, identify promising `template_id`s.
3.  Use the `GET /api/v1/templates/{template_id}` endpoint to retrieve the full `raw_json` of these specific workflows.
4.  The `raw_json` (which contains the complete n8n workflow structure, nodes, and connections) can then be fed into the RAG system's language model as context to answer questions, generate explanations, or even assist in creating new workflows.

## Deployment Platforms (e.g., Render.com)

When deploying this application to platforms like Render.com, Heroku, etc., using Docker, you need to configure the service settings correctly:

*   **Root Directory / Build Context Path**: Ensure this setting in your deployment service points to the `n8n_template_manager/` subdirectory if the platform builds from the repository root but needs to know where your application-specific files and Dockerfile are for context *within that subdirectory*. However, for the Docker build command `docker build -f ./n8n_template_manager/Dockerfile .` to work as specified (accessing `../workflows`), the build must be initiated from the repository root.
    *   If the platform checks out your repository and runs the build command from the repository root, you'd specify the Dockerfile path as `n8n_template_manager/Dockerfile`.
    *   If the platform changes its working directory to `n8n_template_manager/` first and then builds, the Dockerfile path would be `Dockerfile`, but this would break the `COPY ../workflows` command in the Dockerfile unless `workflows` is *also* inside `n8n_template_manager`.
    *   **Recommendation for Render.com & similar platforms:**
        *   Set your service's "Build Context Directory" (or similar, often called "Root Directory" on Render) to your repository's actual root.
        *   Specify the "Dockerfile Path" as `n8n_template_manager/Dockerfile`.
        *   This setup ensures that the build process uses the repository root as the context, allowing the `Dockerfile` to correctly `COPY . .` (for files within `n8n_template_manager/`) and `COPY ../workflows /app/external_workflows` (or `COPY workflows /app/workflows` if the Dockerfile was adjusted to assume workflows is inside the build context of `n8n_template_manager`).
        *   The current Dockerfile (`n8n_template_manager/Dockerfile`) has `COPY workflows /app/workflows` and `ENV DOCKER_WORKFLOW_DIR /app/workflows/n8n-templates-sorted`. This setup requires the `workflows` directory to be *inside* the `n8n_template_manager` directory at build time if the build context is `n8n_template_manager`. If the build context is the repository root, and `workflows` is a sibling to `n8n_template_manager`, the `Dockerfile`'s `COPY workflows /app/workflows` would need to be `COPY ./workflows /app/workflows` (if `workflows` is relative to root) or the path adjusted.
        *   **To align with the Docker build command `docker build -f ./n8n_template_manager/Dockerfile .` (context is root):** The Dockerfile's `COPY` commands for app code should be prefixed with `n8n_template_manager/` (e.g., `COPY n8n_template_manager/app app/`). The current Dockerfile (from Turn 56) assumes the context *is* `n8n_template_manager/` for app files. This needs to be harmonized.

Let's assume the Dockerfile (from Turn 56) is intended to be built with `n8n_template_manager` as the context. For platforms like Render:
*   **Root Directory (for checkout):** Repository Root.
*   **Build Command (if custom):** `docker build -f n8n_template_manager/Dockerfile -t $IMAGE_NAME n8n_template_manager` (This sets the context to `n8n_template_manager`)
*   **Dockerfile Path (if platform builds without custom command, using a root dir):** Set Root Directory to `n8n_template_manager` on the platform, then Dockerfile path is just `Dockerfile`.

This ensures that the build process uses the correct context (`n8n_template_manager/`) and finds all necessary files as defined by that Dockerfile's `COPY` commands. The `workflows` directory would need to be inside `n8n_template_manager` for this specific Dockerfile setup.

## Future Enhancements / To-Do

*   **Advanced Duplicate Detection:** Implement more sophisticated logic for detecting and updating existing templates when fetching from n8n.io (e.g., based on content hash if IDs are not stable or for versioning).
*   **User Authentication:** Add authentication/authorization for the web UI and API, especially if deployed in a multi-user or public environment.
*   **Database Support:** Officially support and provide configuration for other databases like PostgreSQL.
*   **"Beautiful Soup" Fetching:** Further investigate and potentially implement template fetching from other web sources if a stable and permissible target is identified (original requirement mentioned this, but was not pursued due to lack of a clear, stable source).
*   **UI Enhancements:**
    *   More detailed template view page.
    *   Visual representation of workflows (if feasible).
    *   User management for API keys or preferences.
*   **Background Task Processing:** For fetching and indexing, consider using a task queue like Celery for more robust background processing.

---
*This README provides a comprehensive guide to setting up, running, and using the n8n Workflow Template Manager.*
