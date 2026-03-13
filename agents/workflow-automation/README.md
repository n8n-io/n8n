# Workflow Automation Agent

Expert n8n workflow designer for building, debugging, and optimising automations.

## Capabilities

- **Workflow design**: Full workflow blueprints from a plain-English description
- **Node configuration**: Exact configuration for any built-in node
- **Expression writing**: n8n expression syntax (`{{ }}`) for data transformation
- **Debugging**: Diagnose and fix failing workflows
- **AI workflows**: LangChain agents, RAG pipelines, and AI tool integrations
- **Documentation**: Generate workflow docs and runbooks

## Usage Examples

### Design a new workflow

```
> /workflow-automation Design a workflow that:
  - Triggers every Monday at 9am
  - Fetches all open GitHub issues labeled 'bug'
  - Posts a summary to Slack #engineering with issue count and top 3 links
```

### Debug a failing workflow

```
> /workflow-automation My HTTP Request node is failing with this error:
  "ERROR: Request failed with status code 401"
  The node is calling the HubSpot API with an API key credential.
  Help me fix it.
```

### Write a Code node

```
> /workflow-automation Write a JavaScript Code node that takes items with fields
  { firstName, lastName, email } and outputs { fullName, emailDomain }
  where emailDomain is extracted from the email.
```

### Design a LangChain AI agent

```
> /workflow-automation Design an AI customer support triage agent that:
  - Receives support tickets via webhook
  - Classifies severity (low/medium/high) using Claude
  - Drafts a reply using the company FAQ as context (RAG)
  - Posts to Zendesk and notifies Slack if high severity
```

## Example Output

For a workflow design request, the agent produces:

```
## Workflow: GitHub Issues → Slack Weekly Summary

**Trigger:** Schedule (every Monday 09:00)
**Purpose:** Post a weekly bug count and top issues to Slack

### Node Sequence
1. Schedule Trigger — fires every Monday at 9am
2. GitHub (list issues) — filter: state=open, label=bug
3. Code — count issues, extract top 3 by creation date
4. Slack — post formatted message to #engineering

### Flow Diagram
Schedule Trigger → GitHub → Code → Slack

### Key Configurations
GitHub node:
  - Resource: Issue
  - Operation: List
  - Filters: state=open, labels=bug
  - Return All: true

Code node:
  const items = $input.all();
  const count = items.length;
  const top3 = items.slice(0, 3).map(i => ({
    title: i.json.title,
    url: i.json.html_url,
  }));
  return [{ json: { count, top3 } }];

Slack node:
  - Channel: #engineering
  - Text: `📋 *Weekly Bug Report*: ${count} open bugs\n${top3.map(i => `• <${i.url}|${i.title}>`).join('\n')}`
```

## Related Resources

- [Use Cases](../../docs/USECASES.md) — Pre-designed workflow patterns
- [Prompts](../../docs/PROMPTS.md) — Prompt templates for workflow design
- [n8n Docs](https://docs.n8n.io) — Official node documentation
