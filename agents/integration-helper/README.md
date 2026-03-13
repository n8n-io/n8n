# Integration Helper Agent

Maps external APIs to n8n workflows and nodes — from analysis to working configuration.

## Capabilities

- **API analysis**: Determine the right n8n approach (native node vs HTTP Request vs custom node)
- **Credential setup**: Step-by-step auth configuration (API key, OAuth2, HMAC)
- **HTTP Request config**: Complete node configurations for any REST endpoint
- **Pagination setup**: Cursor, offset, and page-based pagination patterns
- **Rate limit handling**: Add automatic retry and throttle logic
- **Webhook setup**: Configure incoming webhook receivers and validation

## Usage Examples

### Analyse an API and recommend an approach

```
> /integration-helper I want to connect n8n to the Stripe API.
  I need to:
  1. List all charges from the last 30 days
  2. Sync new charges to a Google Sheet every hour
  3. Trigger an action when a charge fails (webhook)
  
  What's the best approach?
```

### Configure an HTTP Request node for a specific endpoint

```
> /integration-helper Configure an n8n HTTP Request node to call:
  POST https://api.example.com/v2/messages
  
  Headers:
    Authorization: Bearer <token>
    X-Client-Id: <client-id>
  
  Body (JSON):
    { "to": "+1234567890", "content": "Hello", "from": "n8n" }
  
  The API key and client ID are stored in a credential.
```

### Set up pagination for a large API

```
> /integration-helper The GitHub API returns paginated results with a Link header:
  Link: <https://api.github.com/repos/n8n-io/n8n/issues?page=2>; rel="next"
  
  How do I configure the HTTP Request node to fetch ALL issues automatically?
```

### Configure OAuth2 for an unsupported service

```
> /integration-helper Set up OAuth2 credentials in n8n for Notion API:
  - Auth URL: https://api.notion.com/v1/oauth/authorize
  - Token URL: https://api.notion.com/v1/oauth/token
  - Client credentials flow
  - Scopes: read_content write_content
```

## Decision Guide

| Situation | Recommended Approach |
|---|---|
| n8n has a native node | Use the native node — fully managed auth + operations |
| Simple API call, one-off | HTTP Request node — quick to set up |
| Complex API, reused across many workflows | Custom node — better UX for your team |
| Real-time events from external service | Webhook Trigger node or native App Trigger |
| Polling for changes | Schedule Trigger + HTTP Request + IF (new data?) |

## Related Resources

- [Workflow Automation Agent](../workflow-automation/) — build the full workflow after setting up the integration
- [Node Development Agent](../node-development/) — create a custom node if no native integration exists
- [n8n Integrations Directory](https://n8n.io/integrations) — check if a native node exists
- [HTTP Request node docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
