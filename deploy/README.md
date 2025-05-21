# n8n Custom Deployment with Qdrant, Supabase, and Redis Cloud

This directory contains the `docker-compose.yml` and configuration templates to deploy a custom n8n setup. This setup includes:

- **n8n:** Main instance, worker, and webhook services for scalable workflow execution.
- **Qdrant:** A self-hosted vector database.
- **Embedding Service:** Uses `vectorai/sentence-transformers-fastapi` to provide an API for generating text embeddings. It runs on port `8001` by default (configurable via `EMBEDDING_PORT` in `.env`).
- **Supabase (PostgreSQL):** External managed database for n8n data.
- **Redis Cloud:** External managed Redis for caching and n8n queue management.

## Prerequisites

1.  **Server:** A Linux server (e.g., a DigitalOcean Droplet) with root or sudo access.
2.  **Docker:** Docker must be installed. [Install Docker](https://docs.docker.com/engine/install/)
3.  **Docker Compose:** Docker Compose V2 must be installed. [Install Docker Compose](https://docs.docker.com/compose/install/)
4.  **Supabase Account:** A Supabase project for PostgreSQL.
5.  **Redis Cloud Account:** A Redis Cloud subscription for Redis.
6.  **Git:** For cloning this repository.

## Setup Steps

1.  **Clone the Repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>/deploy
    ```

2.  **Create and Configure `.env` File:**
    The `.env` file stores all your secrets and configuration variables.
    - Copy the example template:
      ```bash
      cp .env.example .env
      ```
    - **Edit `.env` with your actual credentials and settings:**
      ```bash
      nano .env
      ```
      Fill in all the required variables, especially:
      - `N8N_ENCRYPTION_KEY`: **Generate a strong, unique random string for this.** You can use `openssl rand -hex 32` to generate one.
      - Supabase connection details (`SUPABASE_HOST`, `SUPABASE_DB_PASSWORD`, etc.).
      - Redis Cloud connection details (`REDIS_HOST`, `REDIS_PASSWORD`, etc.).
      - n8n admin user credentials (`N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`).
      - SMTP details if you want n8n to send emails (e.g., for password resets).

3.  **Pull Docker Images:**
    Download the latest versions of the Docker images defined in `docker-compose.yml`:
    ```bash
    docker compose pull
    ```

## Running the Services

1.  **Start All Services:**
    To start all services in detached mode (in the background):
    ```bash
    docker compose up -d
    ```

2.  **Check Service Status:**
    To see the status of your running containers:
    ```bash
    docker compose ps
    ```
    You should see `n8n-main`, `n8n-worker`, `n8n-webhook`, `qdrant`, and `embedding-service` running.

3.  **View Logs:**
    - To view logs for all services (follow mode):
      ```bash
      docker compose logs -f
      ```
    - To view logs for a specific service (e.g., `n8n-main`):
      ```bash
      docker compose logs -f n8n-main
      ```
    Press `Ctrl+C` to stop following logs.

## Interacting with Services from n8n

Your n8n workflows can interact with the Qdrant and Embedding services using their internal Docker network hostnames and ports.

### Embedding Service Interaction

The `embedding-service` provides an API endpoint to generate vector embeddings from text.
-   **Hostname (within Docker network):** `embedding-service`
-   **Port (within Docker network):** `8001` (or the value of `EMBEDDING_PORT` from your `.env` file)
-   **API Endpoint Example:** `/encode` (common for `vectorai/sentence-transformers-fastapi`)

**Example: Using n8n HTTP Request Node**
1.  **URL:** `http://embedding-service:${EMBEDDING_PORT:-8001}/encode`
    *   *Note: Replace `/encode` if your chosen model/image uses a different endpoint.*
2.  **Method:** `POST`
3.  **Send Body:** `true`
4.  **Body Content Type:** `JSON`
5.  **Body:**
    ```json
    {
      "texts": ["your text to embed", "another text"]
    }
    ```
    *   *The exact JSON structure might vary based on the embedding service's API. Check the documentation for `vectorai/sentence-transformers-fastapi` or your chosen image.*
6.  **Output:** The service will return JSON containing the vector embeddings for the provided texts.

### Qdrant Interaction

Qdrant is your vector database, accessible from n8n.
-   **Hostname (within Docker network):** `qdrant`
-   **Ports (within Docker network):**
    -   `6333` (gRPC)
    -   `6334` (REST API)

**Using the n8n Qdrant Node:**
-   n8n has a dedicated "Qdrant" node.
-   When configuring this node, use the REST API URL: `http://qdrant:6334`.
-   If you have configured an API key for Qdrant in your `.env` file (`QDRANT_API_KEY`), you will need to add this to the Qdrant node credentials in n8n.

**Common Operations with the Qdrant Node:**
-   **Create Collection:** Define a new collection to store your vectors, specifying its configuration (e.g., vector size, distance metric).
-   **Upsert Points:** Add or update vector embeddings (points) along with their associated JSON payloads (metadata). The vectors should be generated by the embedding service.
-   **Search Points:** Find vectors in a collection that are most similar to a given query vector.

## Accessing n8n

Once started, the main n8n instance should be accessible at `http://<your_server_ip>:${N8N_PORT}` (e.g., `http://your_server_ip:5678` if you used the default port).

## Stopping the Services

1.  **Stop Services:**
    To stop all running services:
    ```bash
    docker compose down
    ```

2.  **Stop Services and Remove Volumes (Caution: Data Loss):**
    If you want to stop services AND remove all persistent data (n8n workflows, Qdrant data):
    ```bash
    docker compose down -v
    ```
    **Warning:** This will delete all data stored in Docker volumes. Use with caution.

## Basic Firewall Configuration (Example with UFW for Ubuntu)

It's crucial to secure your server with a firewall. Here's a basic example using UFW:

1.  **Install UFW (if not already installed):**
    ```bash
    sudo apt update
    sudo apt install ufw
    ```

2.  **Set Default Policies:**
    ```bash
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    ```

3.  **Allow SSH (Essential!):**
    If you're connected via SSH, ensure you allow SSH before enabling UFW.
    ```bash
    sudo ufw allow ssh  # Or specify your custom SSH port: sudo ufw allow 2222/tcp
    ```

4.  **Allow n8n Port:**
    Replace `5678` with the `N8N_PORT` you configured in your `.env` file.
    ```bash
    sudo ufw allow ${N8N_PORT:-5678}/tcp
    ```

5.  **Allow Qdrant Ports (Optional - if external access is needed):**
    Qdrant is typically accessed by n8n internally. If you need direct external access to Qdrant's API:
    ```bash
    sudo ufw allow 6333/tcp # gRPC
    sudo ufw allow 6334/tcp # REST
    ```

6.  **Allow Embedding Service Port (Optional - if external access is needed):**
    The embedding service is also typically accessed by n8n internally. If you need direct external access to its API:
    ```bash
    sudo ufw allow ${EMBEDDING_PORT:-8001}/tcp
    ```

7.  **Enable UFW:**
    ```bash
    sudo ufw enable
    ```
    Confirm with `y`.

7.  **Check Status:**
    ```bash
    sudo ufw status verbose
    ```

## Important Notes

-   **`N8N_ENCRYPTION_KEY`:** This key is critical for securing credentials stored by n8n. Keep it safe and ensure it's a strong, random string. If you lose it, you will lose access to encrypted credentials in your workflows.
-   **`.env` File Security:** The `.env` file contains sensitive credentials. Ensure it is not publicly accessible and has restrictive file permissions (`chmod 600 .env`). Do NOT commit it to your Git repository.
-   **External Services:** Supabase and Redis Cloud are managed services. You are responsible for setting them up and ensuring they are accessible from your droplet (e.g., firewall rules on their end if applicable).
-   **Embedding Service:** The `embedding-service` uses the `vectorai/sentence-transformers-fastapi` image. It listens on port `8001` internally (configurable via `EMBEDDING_PORT` in `.env`). You'll interact with it from n8n typically via `http://embedding-service:8001/encode` (or your configured `EMBEDDING_PORT`).
-   **Scalability:** This setup provides separate worker and webhook processes for n8n, which is the foundation for scaling. You can scale the number of `n8n-worker` replicas in the `docker-compose.yml` if needed, but ensure your server resources and Redis instance can handle the load.
