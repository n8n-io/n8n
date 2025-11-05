# Quick Start Guide: n8n Workflow Builder Skill

This guide will help you start creating n8n workflows immediately using the Claude Code skill.

## Setup Verification

Verify the skill is installed:
```bash
# Check that these files exist
ls -la .claude/skills/n8n-workflow-builder.md
ls -la .claude/skills/skill.json
```

## Using the Skill

### Method 1: Direct Skill Invocation (Recommended)

In Claude Code, you can invoke the skill directly:

```
Please use the n8n-workflow-builder skill to create [your workflow description]
```

### Method 2: Context-Aware Usage

Simply describe what you want, and Claude Code will automatically use the skill:

```
I need an n8n workflow that [does something]
```

## Quick Examples

### Example 1: Simple API Integration
```
Create an n8n workflow that:
1. Triggers manually
2. Fetches posts from JSONPlaceholder API
3. Filters posts by user ID 1
4. Sends the count to a webhook
```

**Expected Output**:
- Complete workflow JSON
- Node configuration details
- Setup instructions
- File saved to `workflows/api-integration-example.json`

### Example 2: AI Chat Agent
```
Build an n8n AI agent workflow that:
1. Uses Chat Trigger for user input
2. Uses Claude 3.5 Sonnet as the LLM
3. Has access to a calculator tool
4. Includes conversation memory
5. Can help users with math problems
```

**Expected Output**:
- Chat-enabled workflow with Agent node
- Anthropic API credential setup instructions
- Tool configuration
- Memory setup
- Usage guide

### Example 3: Scheduled Data Sync
```
Create a workflow that:
1. Runs every day at 9 AM
2. Fetches new records from a Google Sheet
3. Transforms the data (uppercase names, format dates)
4. Saves to a PostgreSQL database
5. Sends a Slack notification with the count
```

**Expected Output**:
- Cron-triggered workflow
- Google Sheets credential setup
- Data transformation nodes
- PostgreSQL configuration
- Slack webhook setup

## Workflow Output Structure

Each workflow creation will provide:

### 1. Complete Workflow JSON
```json
{
  "name": "Your Workflow Name",
  "nodes": [...],
  "connections": {...},
  "settings": {...}
}
```

### 2. Setup Instructions
```
Required Credentials:
- Google Sheets OAuth2 (read access)
- PostgreSQL (connection string)
- Slack (webhook URL)

Configuration Steps:
1. Import the workflow into n8n
2. Configure credentials for each node
3. Test with sample data
4. Enable workflow
```

### 3. Usage Guide
```
How to Use:
- Trigger: Manual/Webhook/Schedule
- Expected Input: JSON with fields X, Y, Z
- Output: Processed data with fields A, B, C
- Error Handling: Notifications sent to Slack on failure
```

## Best Practices for Requests

### ✅ Good Request Examples

**Specific with Context**:
```
Create a workflow that monitors our GitHub repo for new issues,
filters for bug reports, and creates tickets in Linear with
priority based on labels.
```

**Clear Trigger and Outcome**:
```
Build a webhook workflow that receives Stripe payment events,
validates the signature, and sends a thank you email via SendGrid.
```

**AI Agent with Tools**:
```
Create an AI agent using Claude 3.5 Sonnet that can:
- Search our company wiki (provide search API)
- Answer employee questions
- Escalate to human if uncertain
- Remember conversation context
```

### ❌ Avoid Vague Requests

**Too Vague**:
```
Make a workflow for my business
```

**Better**:
```
Create a workflow that automates customer onboarding by:
1. Receiving new customer data via webhook
2. Creating accounts in our CRM
3. Sending welcome emails
4. Adding to Slack channel
```

## Testing Your Workflows

### Step 1: Import to n8n
1. Open n8n UI
2. Click "Import from File"
3. Select the generated JSON file
4. Click "Import"

### Step 2: Configure Credentials
1. Click on each node with a credential indicator
2. Select or create credentials
3. Test the connection

### Step 3: Test Execution
1. Use "Execute Workflow" for manual triggers
2. Use "Test URL" for webhooks
3. Check "Executions" tab for results
4. Review any errors and adjust

### Step 4: Enable & Monitor
1. Toggle "Active" switch
2. Monitor first few executions
3. Check error notifications
4. Optimize as needed

## Advanced Features

### Referencing Existing Workflows

Ask the skill to check examples first:
```
Before creating a new workflow, check if there are any
similar examples in the cypress/fixtures or test-workflows
directories that we can use as reference.
```

### Debugging Workflows

Get help with existing workflows:
```
Here's my workflow JSON [paste]. It's failing at the HTTP
Request node with a 401 error. Can you help debug and fix it?
```

### Optimizing Workflows

Request improvements:
```
Review this workflow and suggest optimizations for:
- Error handling
- Performance
- Security
- Best practices
```

## Common Use Cases

### 1. Data Integration
- API to Database sync
- Multi-system data synchronization
- ETL pipelines
- Data validation and transformation

### 2. Notifications & Alerts
- Monitoring and alerting
- Status updates
- Digest emails
- Real-time notifications

### 3. AI Automation
- Chat agents with Claude
- Content generation
- Data analysis and insights
- Document processing

### 4. Business Process Automation
- Approval workflows
- Customer onboarding
- Invoice processing
- Report generation

### 5. Developer Tools
- GitHub automation
- CI/CD integration
- Deployment notifications
- Error tracking

## Troubleshooting

### Issue: Workflow doesn't import
**Solution**: Check JSON syntax, ensure all node types are valid

### Issue: Nodes not connecting
**Solution**: Verify connection references match node names exactly

### Issue: Credentials not working
**Solution**: Review setup instructions, check API permissions

### Issue: AI agent not responding
**Solution**: Verify LLM credentials, check token limits, review prompts

### Issue: Workflow times out
**Solution**: Add pagination, reduce batch size, increase timeout settings

## Next Steps

1. **Try it out**: Create your first workflow using one of the examples above
2. **Explore examples**: Browse `cypress/fixtures/` for inspiration
3. **Read docs**: Check `.claude/README.md` for detailed information
4. **Iterate**: Start simple and add complexity gradually
5. **Share feedback**: Report what works and what needs improvement

## Resources

- **Main README**: `.claude/README.md`
- **Skill Documentation**: `.claude/skills/n8n-workflow-builder.md`
- **Example Workflows**: `cypress/fixtures/`, `test-workflows/workflows/`
- **n8n Documentation**: `README.md`, `CONTRIBUTING.md`
- **Saved Workflows**: `workflows/` directory

---

**Happy Automating! 🚀**

Now you have a powerful AI assistant that creates production-ready n8n workflows based on real documentation and best practices.