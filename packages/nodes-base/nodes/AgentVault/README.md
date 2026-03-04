# AgentVault Node for n8n

This node integrates [AgentVault](https://github.com/nKOxxx/agentvault) with n8n, enabling secure credential management and sharing within your workflows.

## Overview

AgentVault provides a secure way to store, retrieve, and share sensitive credentials like API keys, tokens, and passwords between different workflows and agents. This node allows n8n workflows to interact with an AgentVault server for centralized credential management.

## Operations

### Store Credential
Store a new credential or update an existing one in the vault.

**Parameters:**
- Credential Name - A unique identifier for the credential
- Credential Value - The secret value to store (encrypted)
- Type - The type of credential (API Key, OAuth Token, Password, etc.)
- Metadata - Optional key-value pairs for organization
- Tags - Labels for categorizing credentials
- Expiry Date - Optional expiration timestamp

### Get Credential
Retrieve a credential from the vault by name or ID.

**Parameters:**
- Credential Name/ID - The identifier of the credential to retrieve
- Include Metadata - Whether to return additional metadata

### Share Credential
Create a time-limited share token for a credential that can be used by external agents.

**Parameters:**
- Credential Name/ID - The credential to share
- Expiry (Hours) - How long the share token remains valid (1-720 hours)
- Max Uses - Maximum number of times the token can be redeemed
- Recipient - Optional identifier for the intended recipient

### Receive Credential
Redeem a share token to receive a shared credential.

**Parameters:**
- Share Token - The token received from another agent/workflow
- Store Locally - Whether to save the received credential to local vault

### List Credentials
View all stored credentials with optional filtering.

**Parameters:**
- Filter by Type - Filter credentials by type
- Filter by Tags - Filter by assigned tags
- Include Expired - Whether to include expired credentials

## Credentials

To use the AgentVault node, you need to configure the AgentVault API credentials:

- **API URL** - The URL of your AgentVault server
- **API Key** - Your authentication key for the AgentVault server
- **Organization ID** - Optional organization identifier for multi-tenant setups

## Use Cases

### Sharing API Keys Between Workflows
```
Workflow A (Store) → AgentVault → Workflow B (Get)
```

### Secure Credential Handoff to OpenClaw Agents
```
n8n Workflow (Share) → Share Token → OpenClaw Agent (Receive)
```

### Centralized Credential Management
```
Multiple Workflows → AgentVault Server → Audit Logs & Rotation
```

## Example Workflow

1. **Trigger** - On webhook or schedule
2. **AgentVault (Get Credential)** - Retrieve database credentials
3. **Postgres** - Connect using retrieved credentials
4. **AgentVault (Share Credential)** - Create temporary share token for audit

## Security Considerations

- Credentials are encrypted at rest and in transit
- Share tokens are single-use or time-limited
- All access is logged for audit purposes
- Credentials can be automatically rotated
- No credentials are stored in workflow JSON files

## Resources

- [AgentVault Repository](https://github.com/nKOxxx/agentvault)
- [n8n Node Development Docs](https://docs.n8n.io/integrations/creating-nodes/)
