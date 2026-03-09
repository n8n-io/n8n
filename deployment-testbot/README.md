# n8n - TestBot Deployment

TestBot-compatible deployment scripts for n8n workflow automation platform.

## Files

- **setup.sh** - Starts n8n service and creates sample workflows
- **get-token.sh** - Outputs Basic Auth credentials
- **docker-compose.yml** - Service configuration

## TestBot Configuration

```yaml
- uses: skyramp/testbot@v1
  with:
    skyramp_license_file: ${{ secrets.SKYRAMP_LICENSE }}
    cursor_api_key: ${{ secrets.CURSOR_API_KEY }}
    target_setup_command: './deployment-testbot/n8n/setup.sh'
    target_ready_check_command: 'curl -f http://localhost:5678/healthz'
    auth_token_command: './deployment-testbot/n8n/get-token.sh'
    target_teardown_command: 'docker-compose -f deployment-testbot/n8n/docker-compose.yml down'
```

## Application Details

- **Port:** 5678
- **API Base:** http://localhost:5678/api/v1
- **Web UI:** http://localhost:5678
- **Health Endpoint:** /healthz
- **Auth Type:** Basic Auth
- **Credentials:** testuser / testpass123

## API Endpoints

- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/:id` - Get workflow
- `PUT /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/:id/activate` - Activate workflow
- `GET /api/v1/executions` - List executions

## Manual Testing

```bash
# Start services
./setup.sh

# Get credentials
CREDS=$(./get-token.sh)

# Test API
curl -u "$CREDS" http://localhost:5678/api/v1/workflows

# Stop services
docker-compose down
```

## Test Data

Setup script creates 1 sample workflow:
- Sample HTTP Workflow (webhook-based)
