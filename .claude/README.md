# Claude Code Configuration for n8n

This directory contains Claude Code skills and configurations optimized for n8n workflow development.

## Available Skills

### n8n Workflow Builder

**Skill Name**: `n8n-workflow-builder`

**Description**: Expert n8n automation specialist that creates production-ready workflows based on actual n8n documentation and best practices.

**Capabilities**:
- Creates complete, working n8n workflow JSON files
- Leverages 100+ example workflows from the repository
- Follows n8n best practices for structure, error handling, and performance
- Specializes in AI/LangChain agent workflows with Claude integration
- Provides setup instructions and documentation
- References actual n8n codebase and documentation

**How to Use**:

Simply invoke the skill by typing:
```
/skill n8n-workflow-builder
```

Or if Claude Code supports it:
```
@n8n-workflow-builder [your workflow request]
```

**Example Requests**:

1. **Basic Automation**:
   ```
   Create a workflow that fetches data from an API every hour and saves it to Google Sheets
   ```

2. **AI Agent**:
   ```
   Build an AI customer support agent using Claude 3.5 Sonnet that can search our knowledge base and create support tickets
   ```

3. **Webhook Integration**:
   ```
   Create a webhook workflow that receives form submissions, validates the data, and sends notifications to Slack
   ```

4. **Data Processing**:
   ```
   Build a workflow that monitors a folder for new CSV files, processes the data, and sends a summary email
   ```

## Workflow Directory Structure

Workflows created by the skill will be saved to:
```
/home/user/n8n/workflows/
```

## Key Features

### 1. Documentation-Driven
The skill actively references:
- Main n8n README and contributing guidelines
- 100+ example workflows in `cypress/fixtures/`
- 127+ test workflows in `test-workflows/workflows/`
- LangChain integration documentation
- Node-specific documentation

### 2. Best Practices Built-In
All workflows include:
- Proper error handling
- Security considerations (credential management)
- Performance optimizations
- Clear naming conventions
- Visual organization with proper node positioning

### 3. AI/Agent Specialization
Expertise in creating:
- Chat-based AI agents
- Tool-augmented agents (calculator, web scraper, code interpreter)
- Memory-enabled conversations
- Vector store integrations
- Claude 3.5 Sonnet optimized workflows

### 4. Production-Ready Output
Workflows are:
- Complete and valid JSON
- Ready to import into n8n
- Tested against n8n's schema
- Documented with setup instructions
- Include credential placeholders (not actual credentials)

## Examples

### Example 1: Simple HTTP API to Database
```
Request: "Create a workflow that fetches users from JSONPlaceholder API and saves them to a PostgreSQL database"

Output:
- Complete workflow JSON with Manual Trigger → HTTP Request → PostgreSQL nodes
- Connection configuration
- Setup instructions for PostgreSQL credentials
- SQL query examples
```

### Example 2: AI Research Assistant
```
Request: "Build an AI agent that can search the web, summarize findings, and save research to Notion"

Output:
- Chat Trigger workflow with Agent node
- Claude 3.5 Sonnet as LLM
- Web Scraper and Notion tools configured
- Memory for conversation context
- Complete setup guide
```

### Example 3: Scheduled Sync
```
Request: "Create a workflow that syncs Airtable records to Google Sheets every 6 hours"

Output:
- Cron Trigger set to */6 hours
- Airtable fetch with pagination
- Data transformation with Set nodes
- Google Sheets upsert
- Error notification via email
```

## File Locations Reference

### Documentation
- Main README: `/home/user/n8n/README.md`
- Contributing: `/home/user/n8n/CONTRIBUTING.md`
- LangChain nodes: `/home/user/n8n/packages/@n8n/nodes-langchain/README.md`

### Example Workflows
- Cypress fixtures: `/home/user/n8n/cypress/fixtures/` (100+ examples)
- Test workflows: `/home/user/n8n/test-workflows/workflows/` (127+ examples)
- AI agent example: `/home/user/n8n/cypress/fixtures/Workflow_ai_agent.json`

### Node Source Code
- Base nodes: `/home/user/n8n/packages/nodes-base/nodes/`
- LangChain nodes: `/home/user/n8n/packages/@n8n/nodes-langchain/nodes/`
- Agent implementations: `/home/user/n8n/packages/@n8n/nodes-langchain/nodes/agents/`

## Tips for Best Results

1. **Be Specific**: Describe your trigger, data sources, and desired outcome
2. **Mention Integrations**: Name the specific services (Slack, GitHub, etc.)
3. **Specify AI Requirements**: If you need an AI agent, mention the model and capabilities
4. **Ask for Examples**: Request to see similar workflows from the repository first
5. **Iterate**: Start with a basic workflow and ask for enhancements

## Troubleshooting

### Skill Not Found
If the skill isn't recognized:
1. Ensure you're in the `/home/user/n8n` directory
2. Check that `.claude/skills/skill.json` exists
3. Verify the skill file path in skill.json

### Workflow Import Issues
If a generated workflow doesn't import:
1. Check JSON validity with a JSON validator
2. Ensure all node types exist in your n8n instance
3. Verify node type versions match your n8n version
4. Check that node IDs are unique UUIDs

### Missing Nodes
If the workflow references nodes you don't have:
1. Update your n8n instance to the latest version
2. Install required community nodes
3. Ask the skill to use alternative nodes

## Advanced Usage

### Custom Node Development
The skill can also help with:
- Creating custom n8n nodes (TypeScript)
- Contributing to the n8n codebase
- Writing tests for workflows
- Debugging workflow executions

### Integration with n8n Development
```
# Start n8n in development mode
pnpm dev

# Import generated workflows
# Copy JSON from .claude output to n8n UI → Import from File
```

## Updates and Improvements

This skill is based on the current n8n codebase and will be updated as:
- New nodes are added to the repository
- Best practices evolve
- Claude Code capabilities expand
- n8n documentation is updated

## Feedback

To improve this skill:
1. Test generated workflows
2. Report issues or suggestions
3. Share successful workflow patterns
4. Contribute example workflows to the repository

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Compatible with**: n8n latest, Claude Code with skills support