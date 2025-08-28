# n8n Deployment on Doprax

This repository contains the configuration files needed to automatically deploy n8n (workflow automation tool) on the Doprax platform.

## What is n8n?

n8n is a workflow automation tool that helps you automate tasks across different services. It's like Zapier or Make, but open-source and self-hosted.

## Quick Start

### Prerequisites

This repository includes a `Dockerfile` at the root directory, which is **required by Doprax** for deployment. The Dockerfile:
- Uses the official n8n Docker image
- Configures the necessary environment variables
- Sets up health checks
- Exposes the required port (5678)

**Note**: Doprax requires a `Dockerfile` for the main source code deployment, not a `playbook.yaml` file. The `docker-compose.yml` file is provided for local development and alternative deployment methods.

### 1. Deploy to Doprax

1. **Fork or clone this repository** to your GitHub account
2. **Connect to Doprax**:
   - Go to [Doprax](https://doprax.com)
   - Sign up or log in
   - Click "Create New App"
   - Choose "Deploy from Git"
   - Select this repository

### 2. Configure Environment Variables

In your Doprax app settings, configure these environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `N8N_HOST` | The hostname where n8n will be accessible | `localhost` | No |
| `N8N_PROTOCOL` | The protocol to use (http or https) | `https` | No |
| `WEBHOOK_URL` | The webhook URL for n8n | `https://${N8N_HOST}/` | No |
| `GENERIC_TIMEZONE` | Timezone for n8n | `UTC` | No |

### 3. Deploy

Click "Deploy" and wait for the build to complete. Your n8n instance will be available at:
`https://n8n.your-app-name.dopraxapp.com`

## Configuration Files

### `Dockerfile`
The main configuration file for Doprax deployment. It defines:
- The n8n Docker image
- Environment variables
- Port configuration
- Health checks
- Application startup

### `docker-compose.yml`
Alternative Docker Compose configuration for local development or other platforms.

### `env.example`
Template for environment variables configuration.

## Features

- **Automatic HTTPS**: Doprax provides SSL certificates automatically
- **Persistent Storage**: Your workflows and data are stored in persistent volumes
- **Health Monitoring**: Built-in health checks ensure the service is running
- **Resource Management**: Configurable CPU and memory limits
- **File Sharing**: Local files directory for file operations

## Customization

### Adding Custom Nodes

To add custom nodes, you can:
1. Mount additional volumes with your custom nodes
2. Use the n8n CLI to install community nodes
3. Build a custom Docker image with pre-installed nodes

### Database Configuration

By default, n8n uses SQLite. For production use, you can configure PostgreSQL:

```yaml
environment:
  - N8N_DATABASE_TYPE=postgresdb
  - N8N_DATABASE_POSTGRESDB_HOST=your-postgres-host
  - N8N_DATABASE_POSTGRESDB_PORT=5432
  - N8N_DATABASE_POSTGRESDB_DATABASE=n8n
  - N8N_DATABASE_POSTGRESDB_USER=n8n
  - N8N_DATABASE_POSTGRESDB_PASSWORD=your-password
```

### Security Settings

For production deployments, consider enabling:

```yaml
environment:
  - N8N_ENCRYPTION_KEY=your-secure-encryption-key
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=secure-password
```

## Troubleshooting

### Common Issues

1. **App won't start**: Check the logs in Doprax dashboard
2. **Can't access n8n**: Verify the domain configuration
3. **Workflows not saving**: Check volume permissions

### Logs

View logs in the Doprax dashboard under your app's "Logs" section.

### Health Check

The app includes a health check endpoint at `/healthz`. You can monitor this to ensure the service is running properly.

## Support

- [n8n Documentation](https://docs.n8n.io/)
- [Doprax Documentation](https://docs.doprax.com/)
- [n8n Community](https://community.n8n.io/)

## License

This project is based on n8n, which is licensed under the [Sustainable Use License](https://docs.n8n.io/reference/license/).
