# Anonimizador

A secure file anonymization and anonymous transfer service built with Python and FastAPI. This service provides robust metadata removal, encryption, and temporary access token management for secure file sharing.

## Features

- **Metadata Sanitization**: Removes EXIF data from images and metadata from PDF, DOCX, and XLSX documents
- **Advanced Encryption**: Per-file symmetric encryption with master key protection
- **Temporary Download Tokens**: JWT-based tokens with configurable TTL
- **Secure Storage**: Encrypted files with restricted permissions
- **Automatic Cleanup**: Background task for expired file removal
- **n8n Integration**: Webhook notifications for administrative alerts

## Supported File Types

- **Images**: JPG, JPEG, PNG, GIF, BMP
- **Documents**: PDF, DOCX, XLSX

## Installation

### Using Docker (Recommended)

```bash
# Build the image
docker build -t anonimizador .

# Run with required environment variables
docker run -d \
  -p 8000:8000 \
  -e ANONIMIZADOR_MASTER_KEY=$(openssl rand -hex 32) \
  -e ANONIMIZADOR_JWT_SECRET=$(openssl rand -hex 32) \
  -v anonimizador-storage:/var/anonimizador/storage \
  anonimizador
```

### Using pip

```bash
pip install -r requirements.txt
```

### Using uv (Development)

```bash
uv sync --group dev
```

## Configuration

All configuration is done via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ANONIMIZADOR_MASTER_KEY` | 32-byte hex key for encrypting file keys | Random (dev only) |
| `ANONIMIZADOR_JWT_SECRET` | Secret for signing JWT tokens | Random (dev only) |
| `ANONIMIZADOR_TOKEN_TTL` | Download token TTL in seconds | 3600 (1 hour) |
| `ANONIMIZADOR_FILE_EXPIRATION` | File expiration time in seconds | 86400 (24 hours) |
| `ANONIMIZADOR_MAX_UPLOAD_SIZE` | Maximum upload size in bytes | 104857600 (100MB) |
| `ANONIMIZADOR_STORAGE_DIR` | Directory for encrypted file storage | /var/anonimizador/storage |
| `ANONIMIZADOR_CLEANUP_INTERVAL` | Cleanup task interval in seconds | 3600 (1 hour) |
| `ANONIMIZADOR_ALLOWED_EXTENSIONS` | Comma-separated allowed extensions | .jpg,.jpeg,.png,.gif,.bmp,.pdf,.docx,.xlsx |
| `ANONIMIZADOR_N8N_WEBHOOK_URL` | n8n webhook URL for notifications | None |
| `ANONIMIZADOR_HOST` | Server host | 0.0.0.0 |
| `ANONIMIZADOR_PORT` | Server port | 8000 |

### Generating Secure Keys

```bash
# Generate master key (32 bytes = 64 hex characters)
openssl rand -hex 32

# Generate JWT secret
openssl rand -hex 32
```

## Running the Service

### Development

```bash
# With uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the module
python -m app.main
```

### Production

```bash
# Using gunicorn with uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status.

### Service Info

```
GET /info
```

Returns service configuration information.

### Upload File

```
POST /upload
Content-Type: multipart/form-data

file: <binary file data>
```

Response:
```json
{
  "file_id": "abc123...",
  "download_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_expires_in_seconds": 3600,
  "file_expires_in_seconds": 86400,
  "original_size": 1234567,
  "sanitized_size": 1234000
}
```

### Download File

```
GET /download?token=<download_token>
```

Returns the decrypted file with appropriate content type.

### Get File Info

```
GET /file/{file_id}/info
```

Returns metadata about a stored file.

### Refresh Download Token

```
POST /file/{file_id}/token
```

Generates a new download token for an existing file.

### Manual Cleanup

```
POST /admin/cleanup
```

Triggers manual cleanup of expired files.

## n8n Integration

The service can send webhook notifications to n8n for administrative alerts. Configure the `ANONIMIZADOR_N8N_WEBHOOK_URL` environment variable with your n8n webhook URL.

### Webhook Payload

When cleanup errors occur, the service sends:

```json
{
  "event": "cleanup_errors",
  "timestamp": "2024-01-01T12:00:00Z",
  "stats": {
    "checked": 10,
    "deleted": 8,
    "errors": 2,
    "failed_files": ["file_id_1", "file_id_2"]
  }
}
```

### Example n8n Workflow

1. Create a Webhook trigger node with your webhook URL
2. Add a Filter node to check for `event === "cleanup_errors"`
3. Add notification nodes (Slack, Email, etc.) to alert administrators

## Security Considerations

### Encryption

- Each file is encrypted with a unique 256-bit AES-GCM key
- File keys are encrypted with a master key stored on the server
- All encryption uses authenticated encryption (AEAD)

### Access Control

- Files are stored with 0600 permissions (owner read/write only)
- Storage directory has 0700 permissions
- JWT tokens are signed and have configurable expiration
- No sensitive logs are stored

### Production Recommendations

1. **Always set `ANONIMIZADOR_MASTER_KEY`** - Never use auto-generated keys in production
2. **Use HTTPS** - Deploy behind a reverse proxy with TLS
3. **Restrict access** - Use network policies to limit access to the service
4. **Monitor logs** - Set up alerting for errors and suspicious activity
5. **Backup encryption keys** - Securely store the master key for disaster recovery

## E2EE (End-to-End Encryption) - Optional

For additional security, clients can implement client-side encryption using WebCrypto:

1. Generate a random key on the client
2. Encrypt the file before uploading
3. Send only the encrypted file to the server
4. Share the decryption key separately with the recipient
5. Recipient decrypts the file after download

The server will still sanitize and encrypt the (already encrypted) file, providing defense in depth.

## Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=term-missing

# Run linting
ruff check .

# Run formatting check
ruff format --check .
```

## License

This project is part of the n8n ecosystem. See the main repository for license information.
