# IT Ops Agent

AI-powered IT Operations agent that monitors infrastructure, diagnoses incidents, and executes automated remediation using Azure OpenAI.

## Capabilities

- **Infrastructure Monitoring**: Check service health and availability via HTTP endpoints
- **Incident Diagnosis**: Analyze alerts, review logs, and identify root causes
- **Runbook Execution**: Execute automated remediation (restarts, cache clear, scaling)
- **Metrics Analysis**: Fetch and interpret system performance metrics
- **Status Reports**: Generate incident summaries with severity classification

## Setup

### Prerequisites
- Azure OpenAI API key with a deployed model (e.g., `gpt-4o`)
- Access to your monitoring and log aggregation APIs
- n8n instance running

### Configuration Steps
1. Import the workflow template from `packages/frontend/editor-ui/src/features/workflows/templates/utils/samples/it_ops_agent.json`
2. Configure **Azure OpenAI Chat Model** credentials
3. Update HTTP Request tool URLs to point to your monitoring endpoints:
   - **Check Service Health** → Your health check endpoints
   - **Get System Metrics** → Prometheus/Datadog/CloudWatch API
   - **Fetch Logs** → Elasticsearch/Splunk/Loki API
   - **Execute Runbook Action** → Ansible Tower/Rundeck API
4. Click **Open Chat** to start monitoring

## Usage Examples

### Check infrastructure health
```
> Check the health status of our web servers and API gateway.
```

### Diagnose an incident
```
> We received a high CPU alert on prod-server-01. Diagnose the issue and recommend remediation.
```

### Execute a runbook
```
> Restart the API service on app-server-02 and verify it's healthy.
```

### Generate status report
```
> Generate a status report for all P1 and P2 incidents from the last 24 hours.
```

## Workflow Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Chat Trigger    │────▶│  IT Ops Agent    │
│  (Alert/Query)   │     │  (AI)            │
└─────────────────┘     └────────┬─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
        ┌─────▼─────┐   ┌──────▼──────┐   ┌──────▼──────┐
        │  Service   │   │  System     │   │  Fetch      │
        │  Health    │   │  Metrics    │   │  Logs       │
        └───────────┘   └─────────────┘   └─────────────┘
                                │
                        ┌──────▼──────┐
                        │  Execute    │
                        │  Runbook    │
                        └─────────────┘
```

## Related Resources

- [Workflow Template](../../packages/frontend/editor-ui/src/features/workflows/templates/utils/samples/it_ops_agent.json)
- [Azure OpenAI Credentials](../../packages/@n8n/nodes-langchain/credentials/AzureOpenAiApi.credentials.ts)
- [n8n AI Agent Docs](https://docs.n8n.io/advanced-ai/)
