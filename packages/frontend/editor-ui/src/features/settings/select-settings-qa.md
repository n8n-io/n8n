## n8n Assistant

- Go to `/settings/assistant`.
- Expand a group under Permissions and change a permission mode.
- Open the Preferences group. It appears only when the context-preferences experiment is on. Confirm it offers only Always allow and Blocked.
- When the default-editor experiment is on and you are not an instance admin, change which editor opens a workflow.
- `packages/frontend/editor-ui/src/features/ai/instanceAi/views/SettingsInstanceAiView.vue`
- `packages/frontend/editor-ui/src/experiments/openWorkflowInAssistant/components/DefaultEditorSetting.vue`

## Credential resolvers

- Go to `/settings/resolvers`.
- Edit a resolver. Change the type.
- When non-name fields change, choose clear-credentials Yes or No. The saved value must stay boolean.
- `packages/frontend/editor-ui/src/features/resolvers/components/CredentialResolverEditModal.vue`

## SSO

Go to `/settings/sso`. Pick one protocol and stay in that section. Each role path below is complete on its own.

- `packages/frontend/editor-ui/src/features/settings/sso/views/SettingsSso.vue`

### SAML

Select **SAML**. The SAML form opens.

- Change the SSO toggle. The closed control keeps the status dot.
- `packages/frontend/editor-ui/src/features/settings/sso/components/SamlSettingsForm.vue`

Then follow one role path.

#### SAML — Assigned manually in n8n

- Change the role assignment to **Assigned manually in n8n**. The menu shows a title and a description. The other options are Instance roles via SSO, and Instance and project roles via SSO.
- The mapping method stays hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`

#### SAML — Instance roles via SSO — Map rules on your IdP

- Change the role assignment to **Instance roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules on your IdP**. The menu shows a title and a description. The other option is Map rules inside n8n.
- Change the default instance role. The menu includes **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Project rules stay hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/DefaultConditionRow.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/InstanceRoleAssignmentSelect.vue`

#### SAML — Instance roles via SSO — Map rules inside n8n

- Change the role assignment to **Instance roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules inside n8n**. The menu shows a title and a description.
- Add an instance rule and change its role. This menu does not include **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Change the default-condition role. This menu includes **Block access**.
- Project rules stay hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RoleMappingRuleEditor.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RuleRow.vue`

#### SAML — Instance and project roles via SSO — Map rules on your IdP

- Change the role assignment to **Instance and project roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules on your IdP**. The menu shows a title and a description.
- Change the default instance role. The menu includes **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Project rules stay hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/DefaultConditionRow.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/InstanceRoleAssignmentSelect.vue`

#### SAML — Instance and project roles via SSO — Map rules inside n8n

- Change the role assignment to **Instance and project roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules inside n8n**. The menu shows a title and a description.
- Add an instance rule and change its role. This menu does not include **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Change the default-condition role. This menu includes **Block access**.
- Add a project rule and change its role.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Change the project multi-select. Search, clear the search, pick more than one project, then remove one.
- The project default condition has no role select.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RoleMappingRuleEditor.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RuleRow.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/ProjectRoleAssignmentSelect.vue`

### OIDC

Select **OIDC**. The OIDC form opens.

- Change the prompt.
- Change the SSO toggle and the log-out toggle. The closed control keeps the status dot.
- `packages/frontend/editor-ui/src/features/settings/sso/components/OidcSettingsForm.vue`

Then follow one role path.

#### OIDC — Assigned manually in n8n

- Change the role assignment to **Assigned manually in n8n**. The menu shows a title and a description. The other options are Instance roles via SSO, and Instance and project roles via SSO.
- The mapping method stays hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`

#### OIDC — Instance roles via SSO — Map rules on your IdP

- Change the role assignment to **Instance roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules on your IdP**. The menu shows a title and a description. The other option is Map rules inside n8n.
- Change the default instance role. The menu includes **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Project rules stay hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/DefaultConditionRow.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/InstanceRoleAssignmentSelect.vue`

#### OIDC — Instance roles via SSO — Map rules inside n8n

- Change the role assignment to **Instance roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules inside n8n**. The menu shows a title and a description.
- Add an instance rule and change its role. This menu does not include **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Change the default-condition role. This menu includes **Block access**.
- Project rules stay hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RoleMappingRuleEditor.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RuleRow.vue`

#### OIDC — Instance and project roles via SSO — Map rules on your IdP

- Change the role assignment to **Instance and project roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules on your IdP**. The menu shows a title and a description.
- Change the default instance role. The menu includes **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Project rules stay hidden.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/DefaultConditionRow.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/InstanceRoleAssignmentSelect.vue`

#### OIDC — Instance and project roles via SSO — Map rules inside n8n

- Change the role assignment to **Instance and project roles via SSO**. The menu shows a title and a description.
- Change the mapping method to **Map rules inside n8n**. The menu shows a title and a description.
- Add an instance rule and change its role. This menu does not include **Block access**.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Change the default-condition role. This menu includes **Block access**.
- Add a project rule and change its role.
- Search, clear the search, and pick a system role.
- Pick a custom role, an unavailable role, and the upgrade path when they are shown.
- Change the project multi-select. Search, clear the search, pick more than one project, then remove one.
- The project default condition has no role select.
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RoleMappingRuleEditor.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RuleRow.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/ProjectRoleAssignmentSelect.vue`




## Migration report

- Go to `/settings/migration-report` and open a rule.
- Filter by status. **All** must show every workflow again.
- `packages/frontend/editor-ui/src/features/settings/migrationReport/MigrationRuleDetail.vue`

## External secrets

- Go to `/settings/external-secrets`.
- Connect a provider. Change the type.
- After you choose a provider, change the nested selects that appear for that provider. AWS, Vault, Infisical, and Azure each show an authentication or cloud select. Vault also shows KV version. Azure shows extra fields only when the cloud is Custom. AWS shows the access key fields only for IAM User.
- Option descriptions stay in the menu, including the documentation links.
- The name field, the provider type, the nested fields, and the scope control are the same height.
- In edit mode, open Sharing and change the scope. **Global** must save as the global scope. Each option keeps its icon.
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/components/SecretsProviderConnectionModal.ee.vue`

## Log streaming

- Go to `/settings/log-streaming`.
- Add a destination and choose the type. Options are Webhook, Sentry, and Syslog.
- The Events tab uses checkboxes, not selects.
- `packages/frontend/editor-ui/src/features/integrations/logStreaming.ee/components/EventDestinationSettingsModal.vue`

### Webhook

Shown when the type is Webhook.

- Change the method. Options are GET, POST, and PUT.
- Turn on Add Query Parameters. Change Specify Query Parameters.
- **Using Fields Below** shows name and value rows. **Using JSON** shows a JSON field instead.
- Turn on Add Headers. Change Specify Headers. The same two options apply.
- Open Options and add each option. Array Format in Query Parameters is listed only when Add Query Parameters is on. Each array-format option keeps its description (No Brackets, Brackets Only, Brackets with Indices).
- Add Proxy and change the protocol. Options are HTTPS and HTTP.
- Add Socket. Its add control lists Keep Alive, Max Sockets, and Max Free Sockets. Those fields are not selects.
- Open Circuit Breaker Options. The add control lists Max Failures and Failure Window. Those fields are not selects.
- Generic Auth Type stays hidden. The form does not offer an authentication select.
- `packages/frontend/editor-ui/src/features/integrations/logStreaming.ee/logStreaming.constants.ts`

### Syslog

Shown when the type is Syslog.

- Change the protocol. Options are TCP, UDP, and TLS.
- **TLS** shows the TLS CA field. TCP and UDP hide it.
- Change the facility. The closed control shows **Local0** for the default. Kernel is a valid option.
- Open Circuit Breaker Options. The add control lists Max Failures and Failure Window.

### Sentry

Shown when the type is Sentry.

- Sentry has no field select. The DSN is a text field.
- Open Circuit Breaker Options. The add control lists Max Failures and Failure Window.

When Add Option is a plus menu, that is the collection overhaul. The field selects above still apply. When Add Option is a select, pick an option, confirm the field appears, then pick another.

## MCP

- Go to `/settings/mcp`, then Clients.
- Change the client type and the connected period. **All** must clear that filter.
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/components/tabs/OAuthClientsFilters.vue`
- Workflow search and agent search stay on the legacy select. They load results from the server.
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/components/MCPWorkflowsSelect.vue`
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/components/MCPAgentsSelect.vue`

## Context

- Go to `/settings/context/preferences`.
- Create or edit a preference and change the scope. The selected option keeps its icon.
- Search the scope list, clear the search, and pick a scope.
- `packages/frontend/editor-ui/src/features/settings/context/components/PreferenceModal.vue`



## Promotions

- Go to `/settings/promotions` when the feature is enabled.
- Change the connection provider.
- Add a provider. Change the auth type and, for an SSH key, the key type.
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromotionConnectionForm.vue`
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromotionProviderDialog.vue`
