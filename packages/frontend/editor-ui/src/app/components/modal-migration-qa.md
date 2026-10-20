Local QA notes for this branch. Do not commit this file.

This branch moves the remaining `Modal` call sites onto `Dialog` and deletes `Modal`. Test every screen below. Each one is a dialog. Confirm the title row, the body inset, the footer, the close button, Escape, and an overlay click.

`packages/frontend/editor-ui/src/app/components/Modal.vue` is deleted. Nothing should still open that shell.

## Workflow canvas

Go to `/workflow/<workflowId>`.

### Publish

- Choose **Publish** in the canvas header.
- Confirm the version name and description. Overlay click does not close it. Publish, then close.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowPublishModal.vue`

### Activate

- Publish a workflow that has a trigger, then activate it.
- The activation dialog explains where executions appear. It includes a “do not show again” checkbox.
- Activate a second workflow that uses the same webhook path. The conflict dialog lists the other workflow.
- `packages/frontend/editor-ui/src/features/workflows/components/ActivationModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowActivationConflictingWebhookModal.vue`

### Settings

Open the command bar and choose **Open workflow settings**. You can also open it from the workflow menu when that action is shown.

- Change a setting and close. An unsaved change asks you to confirm.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowSettings/WorkflowSettings.vue`

### Duplicate

Open the command bar and choose **Duplicate workflow**. On the workflow list, the card menu **Duplicate** opens the same dialog.

- Enter a name and duplicate. Close cancels it.
- `packages/frontend/editor-ui/src/features/workflows/components/DuplicateWorkflowDialog.vue`

### Import from URL

Open the command bar and choose **Import workflow from URL**.

- Paste a URL and import. An invalid URL keeps import disabled.
- `packages/frontend/editor-ui/src/features/workflows/components/ImportWorkflowUrlModal.vue`

### Description

Open the workflow menu and choose the description action when it is shown.

- Edit the description and save.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowDescriptionModal.vue`

### Convert to sub-workflow

Select two connected nodes that can become a sub-workflow. Open the selection menu and choose **Convert to sub-workflow**.

- Enter a name and convert. Close cancels it.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowExtractionNameModal.vue`

### Node view

Open a node on the same workflow.

- On an HTTP Request node, choose **Import cURL**. Paste a cURL command and import it.
- Run a tool node that still needs agent input. The From AI parameters dialog opens. Overlay click does not close it.
- Run a node that returns a binary file. Open the file preview from the output.
- Open a string parameter and expand it. The text editor opens.
- Open an expression and expand it. The expression editor fills the dialog and keeps its own close control.
- Open a code, JSON, HTML, CSS, or SQL parameter and expand it. The editor fills the dialog.
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/ImportCurlModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/FromAiParametersModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/runData/components/BinaryDataViewModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/TextEdit.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/ExpressionEditModal.vue`
- `packages/frontend/editor-ui/src/features/ndv/parameters/components/ParameterInput.vue`

### Embed chat

- `ChatEmbedModal` is registered. This branch has no menu that opens it.
- Skip this dialog unless a Chat Trigger surface still calls it.
- `packages/frontend/editor-ui/src/app/components/ChatEmbedModal.vue`

## Workflow list

Go to `/home/workflows` or `/projects/<projectId>/workflows`.

### Share

On a workflow card, open the card menu and choose **Share**.

- Add a person or a project and save. Close runs the close check.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowShareModal.ee.vue`

### Folders

Open a folder menu and choose **Delete**. On a workflow card, choose **Move**.

- Delete asks you to confirm. Move picks a folder and confirms.
- `packages/frontend/editor-ui/src/features/core/folders/components/DeleteFolderModal.vue`
- `packages/frontend/editor-ui/src/features/core/folders/components/MoveToFolderModal.vue`

### Tags

Open workflow settings, or the tags control on a workflow, and choose **Manage tags** when it is shown.

- Add a tag and close.
- `packages/frontend/editor-ui/src/features/shared/tags/components/TagsManager/TagsManager.vue`

## Workflow history

Go to `/workflow/<workflowId>/history`.

- Open a version menu and choose **Name version**. Edit the name and description.
- Choose **Publish** on an unpublished version.
- Choose **Unpublish** on the published version. Confirm **Unpublish**. Cancel stays available while Unpublish is loading. The affected-resource list stays in the body when the version has dependents.
- Choose **Compare** or the diff action. The diff fills the viewport and sits flush with the dialog edges. It has no close button. Escape does not close it. Use the back control.
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowVersionFormModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/views/WorkflowHistory.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowHistoryVersionUnpublishModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffModal.vue`

## Credentials

Go to `/home/credentials` or `/projects/<projectId>/credentials`.

- Choose **Create credential**. Pick a credential type. The type dialog closes into the credential editor.
- Open a credential card menu and choose **Move**. Pick a project and confirm.
- `packages/frontend/editor-ui/src/features/credentials/components/CredentialsSelectModal.vue`
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectMoveResourceModal.vue`

## Executions

Go to `/home/executions`, `/projects/<projectId>/executions`, or `/workflow/<workflowId>/executions`.

- Choose **Stop all** or the stop-many action when it is shown. Check the queued, running, and waiting boxes. Confirm stays disabled until one box is checked.
- On a Community plan, choose **Debug in editor** on an execution. The paywall has one **See plans** button.
- `packages/frontend/editor-ui/src/features/execution/executions/components/StopManyExecutionsModal.vue`
- `packages/frontend/editor-ui/src/features/execution/executions/components/DebugPaywallModal.vue`

## Evaluation

Go to `/workflow/<workflowId>/evaluation`.

- Open a test run execution and choose **Add to dataset**. Pick a dataset and confirm.
- `packages/frontend/editor-ui/src/features/ai/evaluation.ee/components/AddExecutionToDataset/AddExecutionToDatasetModal.vue`

## Templates

Go to `/templates/<id>` and open a template that needs credentials.

- Choose **Set up credentials** when the button is shown. Complete a step and close the dialog.
- The same dialog opens from the AI builder when a built workflow still needs credentials.
- `packages/frontend/editor-ui/src/features/workflows/templates/components/SetupWorkflowCredentialsModal.vue`

## Data tables

Go to `/projects/<projectId>/datatables`.

- Choose **Create data table**. Create one from scratch. Close cancels it.
- Choose **Import CSV**. Pick a file and import.
- Open a table and choose the download action when it is shown.
- `packages/frontend/editor-ui/src/features/core/dataTable/components/AddDataTableModal.vue`
- `packages/frontend/editor-ui/src/features/core/dataTable/components/ImportCsvModal.vue`
- `packages/frontend/editor-ui/src/features/core/dataTable/components/DownloadDataTableModal.vue`

## Projects

Go to a project you can delete. Open project settings and choose **Delete**.

- Type the confirmation and delete. Delete stays disabled until the text matches.
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectDeleteDialog.vue`

## About

Open **Settings**. At the bottom of the settings sidebar, choose **About n8n**.

- Confirm the version and the links render. Close it.
- `packages/frontend/editor-ui/src/app/components/AboutModal.vue`

## What's new

Open the main sidebar. Choose **What's new** when the menu shows it.

- Step through the articles. Close it.
- `packages/frontend/editor-ui/src/app/components/WhatsNewModal.vue`

## Personalization

- Sign in on an instance that has not finished personalization. The survey opens on its own.
- Step through the questions. The close button is hidden. Escape and overlay click do not close it.
- `packages/frontend/editor-ui/src/features/settings/users/components/PersonalizationModal.vue`

## Users

Go to `/settings/users`.

- Choose **Invite**. Add an email and send. Close cancels it.
- Open a user row and choose **Delete**. Type `delete all data`. Delete stays disabled until the text matches.
- `packages/frontend/editor-ui/src/features/settings/users/components/InviteUsersModal.vue`
- `packages/frontend/editor-ui/src/features/settings/users/components/DeleteUserModal.vue`

## API keys

Go to `/settings/api`.

- Choose **Create an API key**. Set a label and the scopes, then save. Edit an existing key from its row.
- `packages/frontend/editor-ui/src/features/settings/apiKeys/components/ApiKeyCreateOrEditModal.vue`

## Usage

Go to `/settings/usage`.

- Choose the Community Plus enrollment action when the plan page shows it. The dialog has no close button. Escape and overlay click do not close it. Use the enrollment action or the explicit dismiss control in the body.
- Choose **Enter activation key** when the plan page shows it. Enter a key and activate.
- If activation asks you to accept the license, the EULA dialog opens. Accept stays disabled until the checkbox is checked.
- `packages/frontend/editor-ui/src/features/settings/usage/components/CommunityPlusEnrollmentModal.vue`
- `packages/frontend/editor-ui/src/features/settings/usage/views/SettingsUsageAndPlan.vue`
- `packages/frontend/editor-ui/src/features/settings/usage/components/EulaAcceptanceModal.vue`

## Roles

Go to `/settings/roles`.

- Open the instance roles tab. Delete a custom role that still has users. Pick a replacement role. Delete stays disabled until you pick one.
- On a plan without custom roles, choose a custom role where the upgrade dialog is shown.
- On an instance where you cannot manage roles, the contact-admin dialog opens instead.
- Open a project role. The project role limit dialog opens when the plan blocks another role.
- `packages/frontend/editor-ui/src/features/roles/instance/components/DeleteInstanceRoleModal.vue`
- `packages/frontend/editor-ui/src/features/roles/components/CustomRolesUpgradeModal.vue`
- `packages/frontend/editor-ui/src/features/roles/components/RoleContactAdminModal.vue`
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectRoleUpgradeDialog.vue`

## SSO

Go to `/settings/sso`.

- Change a setting and leave the page. The unsaved-changes dialog offers leave, and save and leave. Close stays on the page.
- In the licensed SAML or OIDC form, change **Role assignment** away from **Assigned manually in n8n**, then choose **Save settings**. The confirm dialog appears on save. Confirm stays disabled until the checkbox is checked.
- Open a provisioning expression and expand it. The expression editor opens.
- `packages/frontend/editor-ui/src/features/settings/sso/views/SettingsSso.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/ConfirmProvisioningDialog.vue`
- `packages/frontend/editor-ui/src/features/settings/sso/provisioning/components/RuleMappingExpressionInput.vue`

## Variables

Go to `/variables` or a project's **Variables** page.

- Choose **Create**. Add a name and a value, then save. Edit an existing variable from its row.
- `packages/frontend/editor-ui/src/features/settings/environments.ee/components/VariableModal.vue`

## Environments

`/settings/environments` is the Git connection page. It has no Push or Pull controls.

Connect Git there and save a branch. Then leave settings and open the home or workflows view. At the bottom of the main sidebar, next to the branch name, choose **Pull** or **Push**. Expand the sidebar if those labels are hidden. The controls appear only when source control is licensed and connected, and only for a user who can push or pull.

- Choose **Push**. Select files and commit. Close runs the close check. Push stays disabled when the branch is read-only. You can also open it from the workflow menu on a canvas.
- Choose **Pull**. Select files and pull. The result dialog opens when the pull finishes. Pull stays disabled unless you are an instance owner or admin.
- Open a workflow diff from the push or pull list. Use the file-diff icon on a workflow row. Its tooltip is **Compare versions**. It appears only when workflow diffs are enabled. On pull, it appears only for a modified workflow. The diff sits flush with the dialog edges. It has no close button. Escape does not close it. Use the back control.
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue`
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPullModal.vue`
- `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/components/SourceControlPullResultModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffModal.vue`

## External secrets

Go to `/settings/external-secrets`.

- Choose **Connect**. Change the provider type. Confirm the nested fields for AWS, Vault, Infisical, and Azure. Close runs the close check.
- Open a connected provider and choose **Delete**. Type the provider name. Delete stays disabled until the name matches.
- The older provider card dialog opens from the same page.
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/components/SecretsProviderConnectionModal.ee.vue`
- `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/components/DeleteSecretsProviderModal.ee.vue`
- `packages/frontend/editor-ui/src/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderModal.ee.vue`

## Credential resolvers

Go to `/settings/resolvers`. In local development the page is in the settings menu even when the feature is off. The list may fail to load. Choose **Add Resolver** to open the dialog.

- Create or edit a resolver. Change the type. Close runs the unsaved-changes check.
- `packages/frontend/editor-ui/src/features/resolvers/components/CredentialResolverEditModal.vue`

## Migration report

Go to `/settings/migration-report` and open a rule.

- Choose **Migrate** on a workflow. The dialog stays open when you click the overlay. Confirm the migration.
- `packages/frontend/editor-ui/src/features/settings/migrationReport/MigrateWorkflowModal.vue`

## Promotions

Go to `/settings/promotions` when the feature is enabled.

- Add or change a connection. Change the provider, the auth type, and the key type.
- Escape and overlay click do not close it while an apply is running. The change list sits flush with the dialog edges.
- `packages/frontend/editor-ui/src/features/integrations/promotions.ee/components/PromotionSelectModal.vue`

## Community nodes

Go to `/settings/community-nodes`.

- Choose **Install**. Enter a package name and install.
- On an installed package, choose **Update** and **Uninstall**. Each confirm is a dialog.
- `packages/frontend/editor-ui/src/features/settings/communityNodes/components/CommunityPackageInstallModal.vue`
- `packages/frontend/editor-ui/src/features/settings/communityNodes/components/CommunityPackageManageConfirmModal.vue`

## Log streaming

Go to `/settings/log-streaming`.

- Choose **Add destination**. Pick a destination type and save. Edit an existing destination from its row.
- `packages/frontend/editor-ui/src/features/integrations/logStreaming.ee/components/EventDestinationSettingsModal.vue`

## Insights

Go to `/insights` on a plan that shows the upgrade prompt.

- Choose the upgrade action. Confirm the dialog, then close it.
- `packages/modules/insights/frontend/src/components/InsightsUpgradeModal.vue`

## Chat

Go to `/home/chat`.

- Open the model selector and choose **Add model** or the custom-model action. Enter a model id.
- Open the tools control. The tools manager opens. Edit one tool. The tool settings dialog is a second dialog.
- Start a new assistant session when the current session has messages. The new-session dialog asks you to confirm.
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ModelByIdSelectorModal.vue`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ToolsManagerModal.vue`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ToolSettingsModal.vue`
- `packages/frontend/editor-ui/src/features/ai/assistant/components/Chat/NewAssistantSessionModal.vue`

### Personal agents

Go to `/home/chat/personal-agents`.

- Create an agent. The editor opens.
- Edit an agent. The header includes a delete action. The close button sits beside it, in line with the title.
- Open the credential selector from a model or tool that needs one.
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/AgentEditorModal.vue`
- `packages/frontend/editor-ui/src/features/ai/components/CredentialSelectorModal.vue`

### Provider settings

Go to the chat settings page when chat is on.

- Open a provider row and choose the settings action. Change a setting and save.
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ProviderSettingsModal.vue`

## n8n Assistant

The assistant opens from the canvas or from `/home`.

- Ask the assistant to build a workflow, then review the diff. The diff dialog fills the viewport and sits flush with the edges. Close runs the close check.
- When the assistant needs a credential, the setup-credentials dialog opens. Same component as Templates.
- `packages/frontend/editor-ui/src/features/ai/assistant/components/Agent/AIBuilderDiffModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/templates/components/SetupWorkflowCredentialsModal.vue`

### Browser and computer use

Open the assistant composer menu when those tools are available.

- Choose browser setup. The setup content fills the dialog and sits flush with the edges. Closing it stops the connect flow.
- Choose computer-use setup. The content sits flush with the edges.
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/modals/BrowserUseSetupModal.vue`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/components/modals/ComputerUseSetupModal.vue`

## Experiments

Run these only when the experiment is on.

### Trial intro

- Sign in on a trial instance with the trial-intro experiment on. The dialog opens on its own.
- It has no close button. Escape and overlay click do not close it. Use the step actions.
- `packages/frontend/editor-ui/src/experiments/trialIntroModal/components/TrialIntroModal.vue`

### Credential app install

- Open the credentials app-selection experiment and choose an app that is not installed.
- Confirm the install dialog.
- `packages/frontend/editor-ui/src/experiments/credentialsAppSelection/components/AppInstallModal.vue`

### Template recommendations

- Create a workflow from a blank canvas with the template recommendation experiment on.
- The node recommendation dialog opens. V2 and V3 are separate dialogs.
- `packages/frontend/editor-ui/src/experiments/templateRecoV2/components/NodeRecommendationModal.vue`
- `packages/frontend/editor-ui/src/experiments/personalizedTemplatesV3/components/NodeRecommendationModal.vue`

### MCP nudges

- On a new Cloud user with the surface-MCP experiment on, finish the onboarding prompt. The onboarding dialog has a header graphic.
- Trigger the MCP JSON nudge. Closing it records the dismissal.
- Trigger **Expose all workflows to MCP**. Overlay click does not close it. The actions record the dismissal.
- `packages/frontend/editor-ui/src/experiments/surfaceMcpToNewCloudUsers/components/onboarding/MCPOnboardingModal.vue`
- `packages/frontend/editor-ui/src/experiments/mcpJsonNudge/components/McpJsonNudgeModal.vue`
- `packages/frontend/editor-ui/src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.vue`
