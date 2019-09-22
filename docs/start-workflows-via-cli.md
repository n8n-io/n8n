# Start Workflows via CLI

Workflows can not just be started by triggers, webhooks or manually via the
Editor it is also possible to start them directly via the CLI.

Execute a saved workflow by its ID:

```bash
n8n execute --id <ID>
```

Execute a workflow from a workflow file:
```bash
n8n execute --file <WORKFLOW_FILE>
```
