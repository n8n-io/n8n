# n8n QA Automation Dockerfile
# This Dockerfile sets up an environment for running Cypress tests against n8n

FROM cypress/included:12.17.1

# Set working directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    gnupg \
    lsb-release \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 16.x
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install n8n CLI for workflow management
RUN npm install -g n8n

# Copy package.json and install dependencies
COPY ./qa-automation/package.json* ./
RUN npm install

# Copy Cypress configuration
COPY ./qa-automation/cypress.json ./

# Copy test files
COPY ./qa-automation/cypress ./cypress
COPY ./qa-automation/functions ./functions
COPY ./qa-automation/scripts ./scripts
COPY ./qa-automation/workflows ./workflows

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Set environment variables
ENV CYPRESS_BASE_URL=http://n8n:5678
ENV NODE_ENV=test

# Add Cypress binary to PATH
ENV PATH="/root/.cache/Cypress/12.17.1/Cypress/Cypress:${PATH}"

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://n8n:5678/healthz || exit 1

# Set entrypoint
ENTRYPOINT ["./scripts/run_cypress.sh"]

# Default command
CMD ["--browser", "chrome"]