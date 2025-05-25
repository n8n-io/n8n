# n8n Unlicensed Docker Setup

This setup provides a fully unlocked n8n instance with all enterprise features enabled, automatic authentication setup, and a pre-configured API key.

## Quick Start

```bash
# Build the image
docker build -f Dockerfile.n8n-unlicensed -t n8n-unlicensed:latest .

# Run with docker-compose
docker-compose -f docker-compose.n8n-unlicensed.yml up -d

# Or run directly
docker run -d --name n8n-unlicensed \
  -p 7001:5678 \
  -e N8N_ENCRYPTION_KEY=test-key \
  -e N8N_SECURE_COOKIE=false \
  n8n-unlicensed:latest
```

## Features

- ✅ **All License Checks Bypassed** - All enterprise features unlocked
- ✅ **Automatic Setup** - No manual configuration required
- ✅ **Pre-configured Authentication** - Owner account created automatically
- ✅ **Pre-created API Key** - Ready for programmatic access
- ✅ **No Setup Page** - Goes directly to login or dashboard

## Access Details

### Web Interface
- **URL:** http://localhost:7001
- **Email:** `admin@n8n.local`
- **Password:** `N8nPassword123`

### API Access
- **API Key:** `n8n_api_test_key_123456789`
- **Example Usage:**
  ```bash
  # Using wget
  wget -qO- --header="X-N8N-API-KEY: n8n_api_test_key_123456789" \
    http://localhost:7001/api/v1/workflows

  # Using curl
  curl -H "X-N8N-API-KEY: n8n_api_test_key_123456789" \
    http://localhost:7001/api/v1/workflows
  ```

## How It Works

1. **License Bypass:** Uses Node.js module interception to mock the License class
2. **Automatic Setup:** Initialization script runs after n8n starts to:
   - Create the owner account via n8n's API
   - Insert a pre-configured API key into the database
   - Mark setup as complete

3. **Persistent Storage:** All data stored in Docker volume for persistence

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_ENCRYPTION_KEY` | Required | Encryption key for credentials |
| `N8N_SECURE_COOKIE` | `false` | Allow HTTP connections |
| `N8N_BASIC_AUTH_ACTIVE` | `true` | Enable authentication |
| `N8N_USER_MANAGEMENT_DISABLED` | `false` | Enable user management |
| `N8N_DIAGNOSTICS_ENABLED` | `false` | Disable diagnostics |
| `N8N_TELEMETRY_ENABLED` | `false` | Disable telemetry |

### Disable Authentication

To run without authentication, set:
```yaml
- N8N_BASIC_AUTH_ACTIVE=false
```

## File Structure

- `Dockerfile.n8n-unlicensed` - Main Dockerfile with license bypass and setup
- `docker-compose.n8n-unlicensed.yml` - Docker Compose configuration
- `packages/cli/src/license.ts` - Modified to enable VARIABLES feature

## Technical Details

- Base image: `n8nio/n8n:latest`
- Additional tools: sqlite, curl, jq, bash
- License bypass: JavaScript require() interception
- API key format: JSON array scopes `["global:owner"]`
- Database: SQLite (default)

## Troubleshooting

1. **Container won't start:** Check logs with `docker logs n8n-unlicensed`
2. **Can't login:** Wait 10-15 seconds after start for initialization
3. **API key not working:** Ensure using correct header format
4. **Setup page appears:** Clear browser cache and cookies

## Security Notice

This setup is for development/testing only. For production use:
- Change default credentials
- Use proper SSL/TLS certificates
- Enable secure cookies
- Use strong encryption keys
- Follow n8n security best practices