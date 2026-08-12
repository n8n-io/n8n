# Template compatibility demo setup

Use `ai-rss-digest-template.json` with a self-hosted instance where the MCP workflow builder is enabled.

Prepare a personal or team project named `Demos` with:

- One Anthropic credential usable by the project.
- One Notion credential usable by the project.
- No OpenAI credential.
- No Slack credential.
- AI Gateway/n8n credits unavailable.

Before the demo, replace `source-database-id` in the fixture with a database accessible to the demo Notion credential. This keeps the demonstration focused on credential compatibility rather than an unrelated resource-permission failure.

Do not store credential secrets in this fixture or in a seed command. Create the credentials through the normal n8n credential UI, then paste the fixture JSON into an MCP-capable host and ask it to install the template in `Demos`.

Expected preflight:

- RSS Feed Trigger and Basic LLM Chain are compatible.
- OpenAI Chat Model offers an Anthropic replacement and requires a model choice.
- Create digest page offers the sole Notion credential as an exact repair.
- Post digest notification is blocked with a Slack credential setup hint.

After approving the first two repairs, the host should validate the revised workflow and call `create_workflow_from_code` with `disableCredentialAutoAssign: true`. The created workflow must remain inactive and `autoAssignedCredentials` should be empty.
