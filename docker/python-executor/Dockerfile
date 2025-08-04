# Python Executor Docker Image for n8n
# This image provides a secure, sandboxed environment for executing Python code
# with commonly used data science and automation libraries

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash n8nuser

# Install common Python packages for data science and automation
RUN pip install --no-cache-dir \
    # Core data science libraries
    numpy==1.24.3 \
    pandas==2.0.3 \
    scipy==1.11.1 \
    matplotlib==3.7.2 \
    seaborn==0.12.2 \
    plotly==5.15.0 \
    scikit-learn==1.3.0 \
    # Web scraping and HTTP requests
    requests==2.31.0 \
    beautifulsoup4==4.12.2 \
    selenium==4.10.0 \
    # Database connectivity
    psycopg2-binary==2.9.7 \
    PyMySQL==1.1.0 \
    sqlite3 \
    # File processing
    openpyxl==3.1.2 \
    xlsxwriter==3.1.2 \
    python-docx==0.8.11 \
    PyPDF2==3.0.1 \
    # Date and time handling
    python-dateutil==2.8.2 \
    pytz==2023.3 \
    # JSON and XML processing
    jsonschema==4.18.4 \
    lxml==4.9.3 \
    # Cryptography and security
    cryptography==41.0.3 \
    passlib==1.7.4 \
    # Image processing
    Pillow==10.0.0 \
    # Text processing
    nltk==3.8.1 \
    textblob==0.17.1 \
    # API and web frameworks
    flask==2.3.2 \
    fastapi==0.101.0 \
    # Machine Learning (optional, can be heavy)
    # tensorflow==2.13.0 \
    # torch==2.0.1 \
    # Environment and configuration
    python-dotenv==1.0.0 \
    pyyaml==6.0.1

# Set up the execution environment
RUN mkdir -p /app/workspace /app/temp && \
    chown -R n8nuser:n8nuser /app

# Copy the Python execution script
COPY python-executor.py /app/
RUN chmod +x /app/python-executor.py

# Switch to non-root user
USER n8nuser

# Set environment variables for security
ENV PYTHONPATH=""
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV N8N_PYTHON_SANDBOX=true

# Expose the working directory as a volume
VOLUME ["/app/workspace"]

# Default command (this will be overridden by the service)
CMD ["python", "/app/python-executor.py"]