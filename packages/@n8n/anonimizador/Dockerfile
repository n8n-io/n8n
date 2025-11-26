# Multi-stage build for Anonimizador service
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Production image
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies for pikepdf and pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libqpdf-dev \
    libjpeg62-turbo \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /var/anonimizador/storage \
    && chown -R appuser:appuser /var/anonimizador

# Copy application code
COPY app/ ./app/

# Switch to non-root user
USER appuser

# Environment variables with secure defaults
ENV ANONIMIZADOR_HOST=0.0.0.0
ENV ANONIMIZADOR_PORT=8000
ENV ANONIMIZADOR_STORAGE_DIR=/var/anonimizador/storage
ENV ANONIMIZADOR_TOKEN_TTL=3600
ENV ANONIMIZADOR_FILE_EXPIRATION=86400
ENV ANONIMIZADOR_MAX_UPLOAD_SIZE=104857600

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
