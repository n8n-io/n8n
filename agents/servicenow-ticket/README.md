# ServiceNow Ticket Agent

AI-powered ServiceNow ticket lifecycle management agent that handles end-to-end operations from ticket creation to closure using Azure OpenAI.

## Capabilities

- **Create Incidents**: Log incidents with auto-classification and prioritization
- **Query Incidents**: Search by incident number, status, priority, or keywords
- **Update Incidents**: Add work notes, change status, reassign, update priority
- **Resolve & Close**: Complete incident lifecycle with resolution details and close codes
- **Generate Reports**: Create incident summaries and workload reports

## Setup

### Prerequisites
- Azure OpenAI API key with a deployed model (e.g., `gpt-4o`)
- ServiceNow instance with API access
- ServiceNow user with appropriate roles (itil, rest_api_explorer)
- n8n instance running

### Configuration Steps
1. Import the workflow template from `packages/frontend/editor-ui/src/features/workflows/templates/utils/samples/servicenow_ticket_agent.json`
2. Configure **Azure OpenAI Chat Model** credentials
3. Update each HTTP Request tool with your ServiceNow instance URL:
   - Replace `instance_url` with `https://your-instance.service-now.com`
4. Configure authentication:
   - **Basic Auth**: Set up HTTP Basic Auth credentials with ServiceNow username/password
   - **OAuth2**: Switch to OAuth2 authentication in each tool node
5. Click **Open Chat** to start managing tickets

## Usage Examples

### Create a new incident
```
> Create a P2 incident: "Email server unreachable for all users in Building A.
  Category: Network. Assign to Network Operations Team."
```

### Check ticket status
```
> What's the status of INC0012345?
```

### Update a ticket
```
> Add a work note to INC0012345: "Identified the root cause as a misconfigured firewall rule.
  Working on remediation."
```

### Resolve and close
```
> Resolve INC0012345: "Firewall rule corrected. Email service restored and verified
  with affected users. Root cause: incorrect ACL after maintenance window."
```

### Generate a report
```
> Show me all open P1 and P2 incidents from the last 7 days with their assignment groups.
```

### End-to-end workflow
```
> I'm receiving reports that the VPN is down for remote users.
  1. Create a P1 incident
  2. Assign to Network Operations
  3. After I confirm the fix, close the ticket
```

## Workflow Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Chat Trigger    │────▶│  ServiceNow      │
│  (User Request)  │     │  Agent (AI)      │
└─────────────────┘     └────────┬─────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │              │              │              │
   ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
   │  Create   │ │  Query    │ │  Update   │ │  Resolve  │
   │  Ticket   │ │  Tickets  │ │  Ticket   │ │  & Close  │
   └───────────┘ └───────────┘ └───────────┘ └───────────┘
                                              │
                                       ┌──────▼──────┐
                                       │  Generate   │
                                       │  Report     │
                                       └─────────────┘
```

## Ticket Lifecycle

```
┌────────┐   ┌──────────┐   ┌─────────────┐   ┌─────────┐   ┌──────────┐   ┌────────┐
│  New   │──▶│ Assigned │──▶│ In Progress │──▶│ Pending │──▶│ Resolved │──▶│ Closed │
└────────┘   └──────────┘   └─────────────┘   └─────────┘   └──────────┘   └────────┘
```

## Related Resources

- [Workflow Template](../../packages/frontend/editor-ui/src/features/workflows/templates/utils/samples/servicenow_ticket_agent.json)
- [Azure OpenAI Credentials](../../packages/@n8n/nodes-langchain/credentials/AzureOpenAiApi.credentials.ts)
- [ServiceNow Table API Docs](https://docs.servicenow.com/bundle/washingtondc-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html)
- [n8n AI Agent Docs](https://docs.n8n.io/advanced-ai/)
