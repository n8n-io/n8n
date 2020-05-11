# Start Workflows via CLI

Workflows cannot be only started by triggers, webhooks or manually via the
Editor. It is also possible to start them directly via the CLI.

Execute a saved workflow by its ID:

```bash
n8n execute --id <ID>
```

Execute a workflow from a workflow file:
```bash
n8n execute --file <WORKFLOW_FILE>
```
