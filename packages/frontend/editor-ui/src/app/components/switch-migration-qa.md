Local QA notes for this branch.

This branch replaces every `ElSwitch` with `N8nSwitch`. Test every screen below. Confirm the switch turns on and off, keeps the saved value after refresh, and ignores clicks while it is disabled.

The settings switches use the large size. Node parameter switches use the small size. The on color comes from the design system. A save in progress disables the switch. It does not show the old loading spinner.

## Node parameters

Open a workflow. Open a node that has a boolean parameter. HTTP Request **Send Body** is one example.

- Turn the parameter on and off. The value stays after you close and reopen the node.
- A read-only workflow keeps the switch disabled.
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/ParameterInput.vue`

## Workflow settings

Open a workflow. Open the command bar and choose **Open workflow settings**.

- **Timeout Workflow** reveals the hours, minutes, and seconds fields when it is on. Turn it off and the fields hide.
- **Available in MCP** shows only when MCP is enabled. Turn it on and off.
- **Redact the executions of workflows that call this one** shows when data redaction applies. A locked or unlicensed switch stays disabled.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowSettings/WorkflowSettings.vue`

## Chat tools

Open a chat that can use tools. Open the tools manager.

- Turn a configured tool on and off.
- A role-blocked tool does not show the switch.
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ToolListItem.vue`

## Log streaming

Go to `/settings/log-streaming`.

- On a destination card, turn the destination on and off. The status text changes. A failed save shows an error and leaves the previous state.
- In a non-production build, **Disable License** sits next to the heading. Turn it on and off.
- Open a destination. Turn **Send Headers** on. The header fields appear.
- `packages/frontend/editor-ui/src/features/integrations/logStreaming.ee/components/EventDestinationCard.vue`
- `packages/frontend/editor-ui/src/features/integrations/logStreaming.ee/views/SettingsLogStreamingView.vue`

## Security

Go to `/settings/security`.

- **Enforce two-factor authentication** turns on and off. An unlicensed instance shows a disabled switch and an upgrade tooltip.
- **Sharing workflows and credentials** and **Publishing workflows** turn on immediately. Turning one off asks you to confirm. Cancel leaves it on.
- **Enforce data redaction** turns on and off. An unlicensed instance shows a disabled switch and an upgrade tooltip.
- **Enable workflow reviews** turns on immediately. Turning it off asks you to confirm. Cancel leaves it on.
- `packages/frontend/editor-ui/src/features/settings/security/SecuritySettings.vue`
- `packages/frontend/editor-ui/src/features/settings/security/DataRedactionSection.vue`
- `packages/frontend/editor-ui/src/features/settings/security/WorkflowReviewsSection.vue`

## LDAP

Go to `/settings/ldap`.

- **Enable LDAP Login** reveals the connection fields.
- **Ignore SSL/TLS Issues** shows when **Connection security** is not **None**.
- **Enable periodic LDAP synchronization** reveals the sync fields.
- **Enforce Email Uniqueness** saves with the form.
- `packages/frontend/@n8n/design-system/src/components/N8nFormInput/FormInput.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/views/SettingsLdapView.vue`

## External secrets

Go to `/settings/external-secrets`.

- On a provider card, turn the connected switch on and off. A failed save shows an error and leaves the previous state.
- **Enable external secrets for project roles** shows when role-based access is on. Turning it off asks you to confirm. The switch stays disabled while the save runs.
- `packages/frontend/editor-ui/src/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderConnectionSwitch.ee.vue`
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/views/SettingsSecretsProviders.ee.vue`

## MCP

Go to `/settings/mcp`.

- **MCP access for new workflows** shows for a manager when that offer is on. Turn it on and off. The switch stays disabled while the save runs, and while the environment manages MCP.
- `packages/modules/mcp/frontend/src/SettingsMCPView.vue`

Open the MCP onboarding modal from the empty-state tile when that experiment is on.

- Turn MCP access on. The setup steps appear.
- Turn it off. The setup steps hide.
- When the environment manages MCP, the switch stays disabled.
- The switch stays disabled while the change is saving.
- `packages/modules/mcp/frontend/src/components/McpAccessToggle.vue`
- `packages/frontend/editor-ui/src/experiments/surfaceMcpToNewCloudUsers/components/onboarding/MCPOnboardingModal.vue`
