# Development Enterprise Mode

## Overview

This fork includes a **Development Enterprise Mode** that allows you to test all Enterprise features without a valid license. This is intended for development and testing purposes only.

## ⚠️ License Compliance

According to the n8n Enterprise License (`LICENSE_EE.md`):

> You may copy and modify the Software for development and testing purposes, without requiring a subscription.

This feature is **strictly for development and testing**. For production use, you must obtain a valid n8n Enterprise license.

## How to Enable

Set the environment variable `N8N_DEV_ENTERPRISE_MODE=true` to enable all Enterprise features:

### Docker Compose

```yaml
environment:
  N8N_DEV_ENTERPRISE_MODE: "true"
```

### Direct Run

```bash
export N8N_DEV_ENTERPRISE_MODE=true
pnpm start
```

## What Gets Unlocked

When `N8N_DEV_ENTERPRISE_MODE=true`, all of the following features become available:

### Boolean Features (All enabled)
- ✅ Sharing (`feat:sharing`)
- ✅ LDAP (`feat:ldap`)
- ✅ SAML (`feat:saml`)
- ✅ OIDC (`feat:oidc`)
- ✅ MFA Enforcement (`feat:mfaEnforcement`)
- ✅ Log Streaming (`feat:logStreaming`)
- ✅ Advanced Execution Filters (`feat:advancedExecutionFilters`)
- ✅ Variables (`feat:variables`)
- ✅ Source Control (`feat:sourceControl`)
- ✅ External Secrets (`feat:externalSecrets`)
- ✅ Debug in Editor (`feat:debugInEditor`)
- ✅ Binary Data S3 (`feat:binaryDataS3`)
- ✅ Multiple Main Instances (`feat:multipleMainInstances`)
- ✅ Worker View (`feat:workerView`)
- ✅ Advanced Permissions (`feat:advancedPermissions`)
- ✅ Project Roles (Admin, Editor, Viewer)
- ✅ AI Assistant (`feat:aiAssistant`)
- ✅ Ask AI (`feat:askAi`)
- ✅ Folders (`feat:folders`)
- ✅ Insights Views (`feat:insights:*`)
- ✅ API Key Scopes (`feat:apiKeyScopes`)
- ✅ Workflow Diffs (`feat:workflowDiffs`)
- ✅ Custom Roles (`feat:customRoles`)
- ✅ AI Builder (`feat:aiBuilder`)

### Quotas (All unlimited)
- 🔢 Team Projects: **Unlimited** (instead of 0)
- 🔢 Active Workflows: **Unlimited**
- 🔢 Users: **Unlimited**
- 🔢 Variables: **Unlimited**
- 🔢 AI Credits: **1,000,000**
- 🔢 Workflows with Evaluations: **Unlimited**

## Use Cases

This mode is perfect for:

1. **Testing Terraform Provider** - Test all Enterprise resources without a license
2. **Feature Development** - Develop integrations that require Enterprise features
3. **Local Testing** - Test workflows that use Enterprise-only features
4. **CI/CD Pipelines** - Run automated tests against Enterprise features

## Implementation Details

The implementation modifies `/packages/@n8n/backend-common/src/license-state.ts` to:

1. Check for `process.env.N8N_DEV_ENTERPRISE_MODE === 'true'`
2. Return `true` for all `isLicensed()` calls
3. Return `UNLIMITED_LICENSE_QUOTA` (-1) for all quota checks
4. Return 1,000,000 for AI credits

## Building the Docker Image

To build a custom Docker image with this feature:

```bash
# From the n8n repository root
docker build -t kodflow/n8n:dev-enterprise .
```

Or use the provided docker-compose configuration that references this fork.

## Example Docker Compose

```yaml
version: '3.8'

networks:
  n8n_network:
    driver: bridge

services:
  postgres:
    image: postgres:17-alpine
    container_name: n8n-postgresql
    hostname: n8n-postgresql
    restart: unless-stopped
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n_user
      POSTGRES_PASSWORD: SecurePassword
      PGDATA: /var/lib/postgresql/data/pgdata
      TZ: Europe/Paris
    volumes:
      - ./postgresql:/var/lib/postgresql/data
    networks:
      - n8n_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5

  n8n:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: n8n
    hostname: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      # Enable Development Enterprise Mode
      N8N_DEV_ENTERPRISE_MODE: "true"

      # Application
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      NODE_ENV: production

      # Database
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: n8n-postgresql
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_USER: n8n_user
      DB_POSTGRESDB_PASSWORD: SecurePassword

      # Timezone
      GENERIC_TIMEZONE: Europe/Paris
      TZ: Europe/Paris
    volumes:
      - ./data:/home/node/.n8n
      - ./files:/files
    networks:
      - n8n_network
    depends_on:
      postgres:
        condition: service_healthy
```

## Verification

After starting n8n with `N8N_DEV_ENTERPRISE_MODE=true`, you can verify the features are enabled:

1. Login to n8n UI
2. Go to Settings → Enterprise
3. All Enterprise features should appear as enabled
4. Try creating multiple team projects
5. Access features like SAML, LDAP, or Source Control

## Troubleshooting

### Features still locked

- Ensure `N8N_DEV_ENTERPRISE_MODE` is set to exactly `"true"` (string)
- Restart the n8n container/process after setting the variable
- Check logs for any errors during startup

### Docker build fails

- Ensure you're building from the repository root
- Check that all dependencies are available
- Try `docker build --no-cache` for a clean build

## Contributing

If you find issues with this development mode, please open an issue on the repository.

## Disclaimer

This modification is provided as-is for development and testing purposes only. It does not grant any license rights for production use of n8n Enterprise features. For production use, obtain a valid license from n8n.io.
