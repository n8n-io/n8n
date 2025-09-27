# Start from the official n8n image
FROM n8nio/n8n:latest

# Switch to root user to install packages
USER root

# Install Python and basic tools
RUN apk update && \
    apk add --no-cache \
    python3 \
    py3-pip \
    && rm -rf /var/cache/apk/*

# Create a virtual environment
RUN python3 -m venv /opt/venv

# Install packages in the virtual environment
COPY requirements.txt .
RUN if [ -f requirements.txt ]; then \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt; \
    fi

# Create a symlink to make the virtual environment Python available system-wide
RUN ln -sf /opt/venv/bin/python /usr/local/bin/python && \
    ln -sf /opt/venv/bin/pip /usr/local/bin/pip

# Switch back to n8n user for security
USER node

# Set PATH to include the virtual environment (optional but helpful)
ENV PATH="/opt/venv/bin:${PATH}"

# n8n will start automatically (from the base image)
