# Node Development Agent

Scaffolds, implements, and tests custom n8n integration nodes.

## Capabilities

- **Scaffold new nodes**: Generate complete `INodeType` implementations from an API description
- **Add operations**: Add new operations to existing nodes
- **Credential definitions**: Create `ICredentialType` for any auth pattern
- **OAuth2 flows**: Authorization code, client credentials, and device flow
- **Unit tests**: Jest tests for node execute methods
- **Migration**: Upgrade nodes to newer n8n node versions

## Usage Examples

### Create a new node from scratch

```
> /node-development Create a custom n8n node for the Stripe API.
  I need these operations:
  - Customer: Create, Get, Update, List
  - PaymentIntent: Create, Confirm, Cancel
  Auth: Stripe API key (Bearer token)
  Base URL: https://api.stripe.com/v1
```

### Add an operation to an existing node

```
> /node-development Add a "List Transactions" operation to the Stripe node at
  packages/nodes-base/nodes/Stripe/Stripe.node.ts
  
  API endpoint: GET /v1/charges
  Parameters: limit (number, 1-100), customer (string, optional), created (date range)
  Response: { data: Charge[], has_more: boolean }
```

### Create an OAuth2 credential

```
> /node-development Create an OAuth2 credential for Google Calendar:
  - Auth URL: https://accounts.google.com/o/oauth2/v2/auth
  - Token URL: https://oauth2.googleapis.com/token
  - Scopes: https://www.googleapis.com/auth/calendar.readonly
  - PKCE: true
```

### Write tests for a node

```
> /node-development Write Jest unit tests for the Stripe node's Customer.get operation.
  The node uses httpRequestWithAuthentication with credential name 'stripeApi'.
  Mock a successful response and a 404 error case.
```

## File Locations

When implementing, place files in these locations:

| File type | Location |
|---|---|
| Node implementation | `packages/nodes-base/nodes/<IntegrationName>/<Name>.node.ts` |
| Credential definition | `packages/nodes-base/credentials/<Name>Api.credentials.ts` |
| Node icon (SVG) | `packages/nodes-base/nodes/<IntegrationName>/<name>.svg` |
| Unit tests | `packages/nodes-base/nodes/<IntegrationName>/__tests__/<Name>.test.ts` |

## Development Workflow

```bash
# 1. Scaffold (optional — agent can generate code directly)
cd packages/node-dev
pnpm n8n-node-dev new

# 2. Implement the node (agent provides code)

# 3. Register the node in package.json
# Add to packages/nodes-base/package.json under "n8n.nodes" and "n8n.credentials"

# 4. Build
cd packages/nodes-base
pnpm build

# 5. Run tests
pnpm test <NodeName>

# 6. Test in running n8n
pnpm dev  # from repo root, node appears in editor
```

## Related Resources

- [n8n Node Development Docs](https://docs.n8n.io/integrations/creating-nodes/)
- [Existing Nodes (reference)](../../packages/nodes-base/nodes/)
- [AGENTS.md](../../AGENTS.md) — coding conventions
