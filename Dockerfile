# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files to disc (equivalent to python -B)
# PYTHONUNBUFFERED: Prevents Python from buffering stdin/stdout/stderr (equivalent to python -u)
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# --no-cache-dir: Disables the cache to keep the image size smaller
# --upgrade pip: Upgrades pip to the latest version before installing packages
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the entire project content from the host to the container at /app
# This includes main.py, the app/ directory, scripts/, etc.
COPY . .

# Copy the external 'workflows' directory into the container.
# This assumes the Docker build command is run from the parent directory of 
# 'n8n_template_manager' and 'workflows', e.g., `docker build -f n8n_template_manager/Dockerfile .`
# If the build context is 'n8n_template_manager', this path needs to be relative to that context.
# For simplicity in this Dockerfile, we'll assume the build context allows accessing ../workflows.
# If not, the user must place 'workflows' inside the 'n8n_template_manager' directory before building,
# or adjust the COPY path and build command accordingly.
# Let's assume the user will ensure 'workflows' is accessible relative to the build context,
# and we copy it to /app/external_workflows within the image.
# Example: if `workflows` is alongside `n8n_template_manager`, and build context is parent dir:
# COPY workflows /app/external_workflows
# If `workflows` is copied into `n8n_template_manager` before build, then:
# COPY workflows /app/workflows 
# For this task, we'll assume the former for the COPY command, but the ENV var will point to a path inside /app.
# The user running `docker build` will need to ensure the source path is correct relative to their build context.
# To make this more robust for a build context *at* `n8n_template_manager`, one would typically
# copy the workflows folder into the `n8n_template_manager` folder before building, or use a multi-stage build.
# For now: This copies a directory named 'workflows' (expected to be alongside the 'n8n_template_manager' directory
# if the build context is the parent of 'n8n_template_manager') into '/app/external_workflows'.
COPY ../workflows /app/external_workflows

# Set the DOCKER_WORKFLOW_DIR environment variable for parser_indexer.py
# This path should correspond to where the 'n8n-templates-sorted' subdirectory would be.
ENV DOCKER_WORKFLOW_DIR /app/external_workflows/n8n-templates-sorted

# Expose port 8000 to the outside world once the container has launched
EXPOSE 8000

# Define the command to run your application
# This command runs main.py, which starts the FastAPI server.
# Uvicorn is run directly as specified in main.py's __main__ block for development,
# but for production, a more robust command like `uvicorn main:app --host 0.0.0.0 --port 8000` is typical.
# Here, we rely on the script's own execution.
CMD ["python", "main.py"]

# --- Notes on Building ---
# To build this image, assuming 'n8n_template_manager' and 'workflows' are sibling directories:
# 1. Navigate to the PARENT directory of 'n8n_template_manager' and 'workflows'.
# 2. Run: docker build -t n8n-template-manager -f n8n_template_manager/Dockerfile .
#
# If 'workflows' is placed INSIDE 'n8n_template_manager' (e.g., at 'n8n_template_manager/workflows_data'):
# 1. Navigate to the 'n8n_template_manager' directory.
# 2. Change COPY ../workflows to COPY workflows_data /app/external_workflows (or similar)
# 3. Change ENV DOCKER_WORKFLOW_DIR to /app/external_workflows/n8n-templates-sorted (if structure inside workflows_data is the same)
# 4. Run: docker build -t n8n-template-manager .
#
# The current setup with COPY ../workflows is less common for standard Docker builds where context is the Dockerfile dir.
# A common practice is to ensure all necessary files are within the build context (e.g. n8n_template_manager directory).
# For this assignment, sticking to the specified relative path for `workflows`.
# The `parser_indexer.py` modification will allow it to use the `DOCKER_WORKFLOW_DIR`.
