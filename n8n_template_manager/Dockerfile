# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY app app
COPY scripts scripts
COPY main.py .
# COPY additional specific files/dirs if needed, e.g. workflows/ if they are part of the build context

# If 'workflows' directory is part of the n8n_template_manager build context:
COPY workflows /app/workflows
ENV DOCKER_WORKFLOW_DIR /app/workflows/n8n-templates-sorted

# Expose port 8000
EXPOSE 8000

# Define the command to run your application
CMD ["python", "main.py"]
