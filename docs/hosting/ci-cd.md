---
title: CI/CD integration for n8n workflows
description: Guide to integrating n8n workflows into CI/CD pipelines for version control, testing, and deployment.
---

# CI/CD integration for n8n workflows

n8n workflows can be managed like code in a CI/CD pipeline, enabling version control, automated testing, and deployment across environments (e.g., development, staging, production). This is particularly useful for teams scaling automations, as it reduces manual errors and supports best practices like those in DevOps. Note that some advanced features, such as built-in source control, are available only in n8n's Pro or Enterprise plans.

This guide assumes familiarity with n8n basics and tools like Git, GitHub Actions, or other CI/CD platforms (e.g., GitLab CI, Jenkins). Workflows are exported as JSON files, which can be versioned in Git and deployed via n8n's REST API or CLI-like scripts.

## Why use CI/CD with n8n?

- **Version control**: Track changes to workflows over time.
- **Automated testing**: Run tests on workflows before deployment to catch errors.
- **Environment management**: Deploy to multiple n8n instances (e.g., dev, prod) with environment-specific configurations.
- **Secrets handling**: Securely manage credentials and variables without exposing them in code.
- **Collaboration**: Allow teams to review and merge workflow changes via pull requests.

Without CI/CD, deployments often involve manual exports/imports, which is error-prone for complex setups.

## Setting up environments

Use separate n8n instances for each environment to isolate changes:

1. **Development**: A local or cloud instance for building and testing workflows. Install via Docker or npm (see [Installation](/hosting/installation/)).
2. **Staging/Pre-production**: Mirrors production but with test data. Use the same setup as production but with different credentials.
3. **Production**: Your live instance. Avoid direct edits here—deploy via CI/CD.

Configure each instance with environment variables (e.g., `N8N_HOST`, `N8N_PORT`) in `.env` files or Docker Compose. For self-hosted, use Docker for easy replication.

## Version control for workflows

n8n workflows can be exported as JSON and stored in Git:

1. In the n8n editor, select a workflow and click **Export** > **JSON**.
2. Commit the JSON file to a Git repository (e.g., on GitHub).
3. For automation, use n8n's GitHub node or a scheduled workflow to auto-export and push changes (example workflow: [Backup to GitHub](https://n8n.io/workflows/817)).

In Enterprise plans, use built-in source control to push workflows, variables, and credentials directly to Git (see [Source control](/source-control-environments/)).

## Testing workflows

Test workflows automatically in your CI/CD pipeline:

- **Unit-like tests**: Use n8n's API to execute workflows with mock input and assert outputs. For example, in GitHub Actions:
  ```yaml
  name: Test n8n Workflow
  on: [pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Start n8n
          run: docker run -d -p 5678:5678 --name n8n n8nio/n8n
        - name: Import Workflow
          run: curl -X POST http://localhost:5678/rest/workflows -H "Authorization: Bearer YOUR_API_KEY" -d @workflow.json
        - name: Execute and Test
          run: |
            RESPONSE=$(curl -X POST http://localhost:5678/rest/workflows/1/run -H "Authorization: Bearer YOUR_API_KEY" -d '{"data": {"mock": "input"}}')
            if [[ $RESPONSE != *"expected_output"* ]]; then exit 1; fi



  Integration tests: Trigger full executions and check logs or outputs. Tools like Selenium can automate UI-based tests if needed.
Mock data: Use nodes like "Set" or "Function" to inject test data.

For more granular testing (e.g., asserting specific node outputs), consider converting workflows to code (see below) or using stop/error nodes in test branches.
Deploying workflows
Automate deployment to target environments:

Export/Import via API: In your CI/CD job, use n8n's REST API to import JSON workflows.

Get an API key from Settings > API.
Example curl to import:
bashcurl -X POST https://your-n8n-instance/rest/workflows \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @path/to/workflow.json



Handle sub-workflows: Ensure linked sub-workflows are deployed first and IDs match.
Activation: Use the API to activate workflows post-import (PATCH /rest/workflows/{id} with {"active": true}).
Rollback: Tag versions in Git for easy reversion.

In CI/CD tools:

GitHub Actions: Trigger on merge to main, deploy to prod.
GitLab CI/Jenkins: Similar scripts, with stages for test/deploy.

Avoid duplicate activations (e.g., webhooks) by disabling workflows on import and enabling only needed ones via tags or bulk operations.
Secrets management
Credentials and variables should not be hardcoded:

Environment variables: Use N8N_ENCRYPTION_KEY for encryption; set per environment.
External secrets managers: Integrate with tools like Infisical, AWS Secrets Manager, or HashiCorp Vault (see External secrets). For example, connect n8n to Infisical for dynamic credential pulling.
In CI/CD: Inject secrets via pipeline variables (e.g., GitHub Secrets). During deployment, update credentials via API without exposing them.

For OAuth2 credentials, update callback URLs per environment during migration.
Converting workflows to code (advanced)
For better CI/CD integration, export workflows and run them as code outside n8n:

Use n8n's JSON export and tools like Node.js scripts to execute logic.
Or, build custom nodes in code for reusability (see Custom nodes).
This allows standard testing frameworks (e.g., Jest, pytest) but loses n8n's visual editor.

Best practices

Start small: Test with one workflow before scaling.
Monitor: Use n8n's execution logs and external tools like Prometheus for post-deployment monitoring.
Security: Restrict API access with keys and firewalls.
Community resources: Check the n8n forum for examples or share your setups.
