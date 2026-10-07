## Workflow canvas

Go to `/workflow/<workflowId>`.



### Publish

- Choose **Publish** in the canvas header.
- Confirm the version name and description. Overlay click does not close it. Publish, then close.
- This is a dialog.
- When workflow review is on, **Publish** opens a choice first. Choose publish, or submit for review. After you submit, the confirmation dialog opens. Update an open review from the same menu when that action is shown. Each of these is a dialog.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowPublishModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowPublishModal.test.ts`
- `packages/frontend/editor-ui/src/features/workflow-reviews/components/WorkflowPublishChoiceDialog.vue`
- `packages/frontend/editor-ui/src/features/workflow-reviews/components/WorkflowSubmitForReviewDialog.vue`
- `packages/frontend/editor-ui/src/features/workflow-reviews/components/WorkflowReviewSubmittedDialog.vue`
- `packages/frontend/editor-ui/src/features/workflow-reviews/components/WorkflowUpdateReviewDialog.vue`

### Activate

- Publish a workflow that has a trigger, then activate it.
- The activation dialog explains where executions appear. It includes a “do not show again” checkbox.
- Activate a second workflow that uses the same webhook path. The conflict dialog lists the other workflow.
- Both are dialogs.
- `packages/frontend/editor-ui/src/features/workflows/components/ActivationModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowActivationConflictingWebhookModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowActivationConflictingWebhookModal.test.ts`

### Node view

Open a node on the same workflow.

- On an HTTP Request node, choose **Import cURL**. Paste a cURL command and import it. This is a dialog.
- Run a tool node that still needs agent input. The From AI parameters dialog opens. Overlay click does not close it. This is a dialog.
- Run a node that returns a binary file. Open the file preview from the output. This is a dialog.
- Open a string parameter and expand it. The text editor is a dialog.
- Open an expression and expand it. The expression editor fills the dialog and keeps its own close control. This is a dialog.
- Open a code, JSON, HTML, CSS, or SQL parameter and expand it. The editor fills the dialog. This is a dialog.
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/ImportCurlModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/FromAiParametersModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/FromAiParametersModal.test.ts`
- `packages/frontend/editor-ui/src/features/ndv/runData/components/BinaryDataViewModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/runData/components/BinaryDataViewModal.test.ts`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/TextEdit.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/ExpressionEditModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/ParameterInput.vue`

### Embed chat

- `ChatEmbedModal` is registered. This branch has no menu that opens it.
- Skip this dialog unless a Chat Trigger surface still calls it.
- `packages/frontend/editor-ui/src/app/components/ChatEmbedModal.vue`
- `packages/frontend/editor-ui/src/app/components/ChatEmbedModal.test.ts`

## Credentials

Go to `/home/credentials` or `/projects/<projectId>/credentials`.

- Choose **Create credential**. Pick a credential type. The type dialog closes into the credential editor.
- The editor is a dialog. The close button sits in the header with the title and the save and delete actions. Save, then close. A save in progress keeps it open.
- Delete a credential that other people use, or switch that credential to Fixed. Type the confirmation word. Confirm stays disabled until the word matches. This is a second dialog.
- Open a credential card menu and choose **Move**. Same move dialog as workflows.
- On a node, open a connected private credential and choose **Disconnect**. The confirm includes **Don't show again**. **Disconnect me** is red. This is an alert dialog.
- `packages/frontend/editor-ui/src/features/credentials/components/CredentialsSelectModal.vue`
- `packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/CredentialEdit.vue`
- `packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/TypeToConfirmDialog.vue`
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectMoveResourceModal.vue`
- `packages/frontend/editor-ui/src/features/credentials/components/CredentialPrivateConnectionRow.vue`

## Executions

Go to `/home/executions`, `/projects/<projectId>/executions`, or `/workflow/<workflowId>/executions`.

- Choose **Stop all** or the stop-many action when it is shown. Check the queued, running, and waiting boxes. Confirm stays disabled until one box is checked. This is a dialog.
- On a Community plan, choose **Debug in editor** on an execution. The paywall has one **See plans** button. This is a dialog.
- `packages/frontend/editor-ui/src/features/execution/executions/components/StopManyExecutionsModal.vue`
- `packages/frontend/editor-ui/src/features/execution/executions/components/StopManyExecutionsModal.test.ts`
- `packages/frontend/editor-ui/src/features/execution/executions/components/DebugPaywallModal.vue`

## Workflow history

Go to `/workflow/<workflowId>/history`.

- Open a version menu and choose **Name version**. Edit the name and description. This is a dialog.
- Choose **Publish** on an unpublished version. This is a dialog.
- Choose **Unpublish** on the published version. This is an alert dialog. Confirm **Unpublish**. Cancel stays available while Unpublish is loading. The affected-resource list stays in the body when the version has dependents.
- Choose **Compare** or the diff action. The diff fills the viewport and sits flush with the dialog edges. It has no close button. Escape does not close it. Use the back control. This is a dialog.
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowVersionFormModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowVersionFormModal.test.ts`
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/views/WorkflowHistory.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/views/WorkflowHistory.test.ts`
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowHistoryVersionUnpublishModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowHistoryVersionUnpublishModal.test.ts`
- `packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffModal.test.ts`
- `packages/frontend/editor-ui/src/app/stores/ui.store.registration.spec.ts`

## Evaluation

Go to `/workflow/<workflowId>/evaluation`.

- Open a test run execution and choose **Add to dataset**. Pick a dataset and confirm. This is a dialog.
- Set up a collection when that wizard is shown. The wizard is a dialog. The footer stays on screen when the table is tall.
- On a test comparison, choose **Show more** on a metric that has criteria. The criteria dialog opens.
- `packages/frontend/editor-ui/src/features/ai/evaluation.ee/components/AddExecutionToDataset/AddExecutionToDatasetModal.vue`
- `packages/frontend/editor-ui/src/features/ai/evaluation.ee/components/AddExecutionToDataset/AddExecutionToDatasetModal.test.ts`
- `packages/frontend/editor-ui/src/features/ai/evaluation.ee/components/SetupCollectionWizard/SetupCollectionWizard.vue`
- `packages/frontend/editor-ui/src/features/ai/evaluation.ee/components/Compare/MetricCriteria.vue`

## Templates

Go to `/templates/<id>` and open a template that needs credentials.

- Choose **Set up credentials** when the button is shown. Complete a step and close the dialog.
- The same dialog opens from the AI builder when a built workflow still needs credentials.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/workflows/templates/components/SetupWorkflowCredentialsModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/templates/components/SetupWorkflowCredentialsModal.test.ts`


## Personalization

- Sign in on an instance that has not finished personalization. The survey opens on its own.
- Step through the questions. The close button is hidden. Escape and overlay click do not close it.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/settings/users/components/PersonalizationModal.vue`
- `packages/frontend/editor-ui/src/features/settings/users/components/PersonalizationModal.test.ts`

## Usage

Go to `/settings/usage`.

- Choose the Community Plus enrollment action when the plan page shows it.
- The dialog has no close button. Escape and overlay click do not close it. Use the enrollment action or the explicit dismiss control in the body.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/settings/usage/components/CommunityPlusEnrollmentModal.vue`
- `packages/frontend/editor-ui/src/features/settings/usage/components/CommunityPlusEnrollmentModal.test.ts`
- Choose **Enter activation key** when the plan page shows it. Enter a key and activate. This is a dialog.
- If activation asks you to accept the license, the EULA dialog opens. Accept stays disabled until the checkbox is checked. This is a dialog.
- `packages/frontend/editor-ui/src/features/settings/usage/views/SettingsUsageAndPlan.vue`
- `packages/frontend/editor-ui/src/features/settings/usage/components/EulaAcceptanceModal.vue`

## Roles

Go to `/settings/roles`.

- Open the instance roles tab. Delete a custom role that still has users. Pick a replacement role. Delete stays disabled until you pick one. This is a dialog.
- On a plan without custom roles, choose a custom role where the upgrade dialog is shown. This is a dialog.
- On an instance where you cannot manage roles, the contact-admin dialog opens instead. This is a dialog.
- Open a project role and the members action when it is shown. The project role limit dialog opens when the plan blocks another role. This is a dialog.
- Open a project role and choose the member count when it is shown. The members list is a dialog.
- `packages/frontend/editor-ui/src/features/roles/instance/components/DeleteInstanceRoleModal.vue`
- `packages/frontend/editor-ui/src/features/roles/instance/components/DeleteInstanceRoleModal.test.ts`
- `packages/frontend/editor-ui/src/features/roles/instance/InstanceRolesView.test.ts`
- `packages/frontend/editor-ui/src/features/roles/components/CustomRolesUpgradeModal.vue`
- `packages/frontend/editor-ui/src/features/roles/components/CustomRolesUpgradeModal.test.ts`
- `packages/frontend/editor-ui/src/features/roles/components/RoleContactAdminModal.vue`
- `packages/frontend/editor-ui/src/features/roles/components/RoleContactAdminModal.test.ts`
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectRoleUpgradeDialog.vue`
- `packages/frontend/editor-ui/src/features/roles/project/RoleProjectMembersModal.vue`

## SSO

Go to `/settings/sso`.

- Change a setting and leave the page. The unsaved-changes dialog offers leave, and save and leave. Close stays on the page. This is a dialog.
- In the licensed SAML or OIDC form, change **Role assignment** away from **Assigned manually in n8n**, then choose **Save settings**. The confirm dialog appears on save. Confirm stays disabled until the checkbox is checked. This is a dialog.
- Open a provisioning expression and expand it. The expression editor is a dialog.
- `packages/frontend/editor-ui/src/features/settings/sso/views/SettingsSso.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/ConfirmProvisioningDialog.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/ConfirmProvisioningDialog.test.ts`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RuleMappingExpressionInput.vue`




## Environments

`/settings/environments` is the Git connection page. It has no Push or Pull controls.

Connect Git there and save a branch. Then leave settings and open the home or workflows view. At the bottom of the main sidebar, next to the branch name, choose **Pull** or **Push**. Expand the sidebar if those labels are hidden. The controls appear only when source control is licensed and connected, and only for a user who can push or pull.

- Choose **Push**. Select files and commit. Close runs the close check. This is a dialog. Push stays disabled when the branch is read-only. You can also open it from the workflow menu on a canvas.
- Choose **Pull**. Select files and pull. The result dialog opens when the pull finishes. Both are dialogs. Pull stays disabled unless you are an instance owner or admin.
- Open a workflow diff from the push or pull list. Use the file-diff icon on a workflow row. Its tooltip is **Compare versions**. It appears only when workflow diffs are enabled. On pull, it appears only for a modified workflow. The diff sits flush with the dialog edges. It has no close button. Escape does not close it. Use the back control. This is a dialog.
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue`
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPushModal.test.ts`
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPullModal.vue`
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPullModal.test.ts`
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPullResultModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffModal.vue`

## External secrets

Go to `/settings/external-secrets`.

- Choose **Connect**. Change the provider type. Confirm the nested fields for AWS, Vault, Infisical, and Azure. Close runs the close check. This is a dialog.
- Open a connected provider and choose **Delete**. Type the provider name. Delete stays disabled until the name matches. This is a dialog.
- The older provider card dialog is a dialog too.
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/components/SecretsProviderConnectionModal.ee.vue`
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/components/SecretsProviderConnectionModal.ee.test.ts`
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/components/DeleteSecretsProviderModal.ee.vue`
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/components/DeleteSecretsProviderModal.ee.test.ts`
- `packages/frontend/editor-ui/src/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderModal.ee.vue`

## Credential resolvers

Go to `/settings/resolvers`. In local development the page is in the settings menu even when the feature is off. The list may fail to load. Choose **Add Resolver** to open the dialog.

- Create or edit a resolver. Change the type. Close runs the unsaved-changes check.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/resolvers/components/CredentialResolverEditModal.vue`
- `packages/frontend/editor-ui/src/features/resolvers/components/CredentialResolverEditModal.test.ts`

## Migration report

Go to `/settings/migration-report` and open a rule.

- Choose **Migrate** on a workflow. The dialog stays open when you click the overlay. Confirm the migration.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/settings/migrationReport/MigrateWorkflowModal.vue`
- `packages/frontend/editor-ui/src/features/settings/migrationReport/MigrateWorkflowModal.test.ts`

## Promotions

Go to `/settings/promotions` when the feature is enabled.

- Add or change a connection. Change the provider, the auth type, and the key type.
- Escape and overlay click do not close it while an apply is running. The change list sits flush with the dialog edges.
- This is a dialog.
- Add a promotion provider when that row is shown. The provider form is a dialog.
- Choose **Promote** when the instance is connected. The promote dialog opens.
- When a promote is blocked, the bindings dialog opens so you can map the missing projects. This is a dialog.
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromotionSelectModal.vue`
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromotionSelectModal.test.ts`
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromotionProviderDialog.vue`
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromoteInstanceDialog.vue`
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromotionBindingsDialog.vue`

## MCP

Go to `/settings/mcp`.

- When MCP access is on, turn the status control off. The disable dialog opens. Confirm **Disable MCP access**. This is a dialog. The empty state shows instead while access is off, so this dialog stays hidden until access is on.

### Workflows

Go to `/settings/mcp/workflows`. In local development the page stays open even when MCP access is off, and **Instance-level MCP** is in the settings menu. The workflow list may fail to load. The empty table still has **Connect workflows**.

- Connect workflows. Search, select, and save. Overlay click does not close it. This is a dialog.
- Edit a workflow description from the list when that action is shown. Same description dialog as the canvas.
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/modals/MCPConnectWorkflowsModal.vue`

### Clients

Stay on `/settings/mcp`.

- Choose **Connect** on **Your client**. Pick a client and a connection method. This is a dialog.
- Choose **Allowed callback URLs** when you can manage MCP. Edit the list and save. This is a dialog.
- Open a connected client. The client details dialog shows the client id and secret actions.
- Choose **Revoke access** on a connected client, or from the client details dialog. Confirm **Revoke**. This is an alert dialog. **Revoke** is red.
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/components/McpConnectClientDialog.vue`
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/components/McpAllowedCallbackUrlsDialog.vue`
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/components/OAuthClientDetailsModal.vue`
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/components/RevokeOAuthClientConfirmModal.vue`
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/SettingsMCPView.vue`

### Agents

Go to `/settings/mcp/agents`.

- Connect agents. Search, select, and save. Overlay click does not close it. This is a dialog.
- `packages/frontend/editor-ui/src/features/ai/mcpAccess/modals/MCPConnectAgentsModal.vue`

## Chat

Go to `/home/chat`.

- Open the model selector and choose **Add model** or the custom-model action. Enter a model id. This is a dialog.
- Open the tools control. The tools manager is a dialog. Edit one tool. The tool settings dialog is a second dialog.
- Start a new assistant session when the current session has messages. The new-session dialog asks you to confirm. This is a dialog.
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ModelByIdSelectorModal.vue`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ToolsManagerModal.vue`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ToolsManagerModal.test.ts`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ToolSettingsModal.vue`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ToolSettingsModal.test.ts`
- `packages/frontend/editor-ui/src/features/ai/assistant/components/Chat/NewAssistantSessionModal.vue`

### Personal agents

Go to `/home/chat/personal-agents`.

- Create an agent. The editor is a dialog.
- Edit an agent. The header includes a delete action. The close button sits beside it, in line with the title.
- Open the credential selector from a model or tool that needs one. This is a dialog.
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/AgentEditorModal.vue`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/AgentEditorModal.test.ts`
- `packages/frontend/editor-ui/src/features/ai/components/CredentialSelectorModal.vue`
- `packages/frontend/editor-ui/src/features/ai/components/CredentialSelectorModal.test.ts`

## n8n Assistant

The assistant opens from the canvas or from `/home`.

- Ask the assistant to build a workflow, then review the diff. The diff dialog fills the viewport and sits flush with the edges. Close runs the close check. This is a dialog.
- When the assistant needs a credential, the setup-credentials dialog opens. Same component as Templates.
- `packages/frontend/editor-ui/src/features/ai/assistant/components/Agent/AIBuilderDiffModal.vue`
- `packages/frontend/editor-ui/src/features/ai/assistant/components/Agent/AIBuilderDiffModal.test.ts`

### Browser and computer use

Open the assistant composer menu when those tools are available.

- Choose browser setup. The setup content fills the dialog and sits flush with the edges. Closing it stops the connect flow. This is a dialog.
- Choose computer-use setup. This is a dialog. The content sits flush with the edges.
- On a new assistant thread, the onboarding wizard opens on its own. Step through it. Overlay click does not close it. This is a dialog.
- When the assistant saves a preference, choose edit on that card. The edit dialog opens.
- With run debug on, open the steps list from the debug panel. Confirm the steps dialog renders.
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/modals/BrowserUseSetupModal.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/modals/BrowserUseSetupContent.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/modals/__tests__/BrowserUseSetupModal.test.ts`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/modals/ComputerUseSetupModal.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/modals/ComputerUseSetupContent.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/onboarding/InstanceAiOnboardingWizard.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/PreferenceEditModal.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiLlmStepsModal.vue`

### Assistant settings

Go to `/settings/assistant`.

- Choose **Connect** on **Model**, **Add sandbox** on **Code sandbox**, or **Set up** on **Web search**. Each one opens the same wizard as assistant onboarding, in edit mode. This is a dialog.
- When the assistant is enabled, choose **Disable**. The confirm title is **Disable n8n Assistant?**. Confirm **Disable**. This is a confirm dialog.
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/settings/ConnectionDialog.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/views/SettingsInstanceAiView.vue`

## Agents

Go to `/home/agents` or `/projects/<projectId>/agents`.

- Open an agent card menu and choose **Duplicate**. Enter a name. This uses `AgentModal`, which is a dialog. `AgentModal` draws its own close button in the header row, in line with the title. The body and the footer use the same side inset as the header.
- Open `/projects/<projectId>/agents/<agentId>`.
- Open **More actions** in the agent header and choose **Edit description**. The field and the tip use the same side inset as the header. They do not sit on the dialog edge. This uses `AgentModal`.
- Add a skill, a task, a sub-agent, and a vector store. Each editor uses `AgentModal` or `AgentModalMultiStep`. Both are dialogs. The skill file workspace stays flush with the dialog edges. The workspace owns its spacing.
- Import an agent from JSON. This uses `AgentModal`.
- A destructive confirm in the builder uses `AgentConfirmationModal`. It is a dialog with Cancel and a confirm action. The confirm label comes from the caller.
- On the builder, open **Monthly budget** and **Cost cap per session**. Each editor uses `AgentModal`. Both are dialogs.
- Choose **Add channel**. The channel picker uses `AgentModalMultiStep`. This is a dialog. Open a connected channel to edit it. Same dialog.
- Open a connected tool and edit its settings. The tool config uses `AgentModal`. This is a dialog.
- On the builder, open **Memory** and choose the credential change when episodic memory is on. The credential dialog opens.
- Disconnect a managed Slack channel. The remove confirmation is a dialog.
- Connect a tool from an agent or from the assistant. The tools connection dialog opens. An MCP tool uses the settings form inside that dialog.
- The agent layout note says the header has no divider.
- `packages/frontend/editor-ui/src/features/agents/components/AgentDescriptionModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentDuplicateModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentSkillModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentTaskModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentSubAgentsModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentVectorStoresModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentJsonImportModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentConfirmationModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentBudgetMonthlyModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentBudgetSessionModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentChannelModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentToolConfigModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/modals/AgentModalMultiStep.vue`
- `packages/frontend/editor-ui/src/features/agents/components/modals/AgentModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/AgentMemoryPanel.vue`
- `packages/frontend/editor-ui/src/features/agents/channels/slack/AgentChannelSlackRemoveConfirmation.vue`
- `packages/frontend/editor-ui/src/features/shared/toolsConnection/ToolsConnectionModal.vue`
- `packages/frontend/editor-ui/src/features/shared/toolsConnection/McpToolSettingsContent.vue`
- `packages/frontend/editor-ui/src/features/agents/agents-design-language.md`

## Data encryption keys

Go to `/settings/encryption-keys` when that page is on.

- Choose **Rotate key**. Confirm **Rotate key**. This is an alert dialog. **Rotate key** is red.
- `packages/frontend/editor-ui/src/features/settings/encryption-keys/views/SettingsEncryptionKeys.vue`

## Gateway credits

Go to `/settings/gateway-credits` when Gateway credits is on.

- Choose **Top up balance**. The top-up dialog lists the services. This is an alert dialog.
- `packages/frontend/editor-ui/src/features/ai/gateway/components/AiGatewayTopUpModal.vue`

## Experiments

Run these only when the experiment is on.

### Trial intro

- Sign in on a trial instance with the trial-intro experiment on. The dialog opens on its own.
- It has no close button. Escape and overlay click do not close it. Use the step actions.
- This is a dialog.
- `packages/frontend/editor-ui/src/experiments/trialIntroModal/components/TrialIntroModal.vue`
- `packages/frontend/editor-ui/src/experiments/trialIntroModal/components/TrialIntroModal.test.ts`

### Credential app install

- Open the credentials app-selection experiment and choose an app that is not installed.
- Confirm the install dialog. This is a dialog.
- `packages/frontend/editor-ui/src/experiments/credentialsAppSelection/components/AppInstallModal.vue`

### Template recommendations

- Create a workflow from a blank canvas with the template recommendation experiment on.
- The node recommendation dialog opens. V2 and V3 are separate dialogs.
- `packages/frontend/editor-ui/src/experiments/templateRecoV2/components/NodeRecommendationModal.vue`
- `packages/frontend/editor-ui/src/experiments/personalizedTemplatesV3/components/NodeRecommendationModal.vue`

### MCP nudges

- On a new Cloud user with the surface-MCP experiment on, finish the onboarding prompt. The onboarding dialog has a header graphic. This is a dialog.
- Trigger the MCP JSON nudge. Closing it records the dismissal. This is a dialog.
- Trigger **Expose all workflows to MCP**. Overlay click does not close it. The actions record the dismissal. This is a dialog.
- `packages/frontend/editor-ui/src/experiments/surfaceMcpToNewCloudUsers/components/onboarding/MCPOnboardingModal.vue`
- `packages/frontend/editor-ui/src/experiments/surfaceMcpToNewCloudUsers/components/onboarding/MCPOnboardingModal.test.ts`
- `packages/frontend/editor-ui/src/experiments/mcpJsonNudge/components/McpJsonNudgeModal.vue`
- `packages/frontend/editor-ui/src/experiments/mcpJsonNudge/components/McpJsonNudgeModal.test.ts`
- `packages/frontend/editor-ui/src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.vue`
- `packages/frontend/editor-ui/src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.test.ts`

## Restricted nodes

- Add a node the instance policy blocks. Choose the contact-admin action from the restricted-node notice.
- The dialog lists the admins. Confirm it renders, then close it.
- This is a dialog.
- `packages/modules/type-availability-policies/frontend/src/components/ContactInstanceAdminModal.vue`

## Markdown editor

The expanded editor is a dialog. It is not tied to one product page.

- In Storybook, open **Core/MarkdownEditor** and the **Expanded** story. Confirm the editor fills the dialog and the close button sits on the title row.
- On an agent, expand the instructions editor when that control is shown. Same dialog.
- `packages/frontend/@n8n/design-system/src/components/N8nMarkdownEditor/MarkdownEditor.vue`
