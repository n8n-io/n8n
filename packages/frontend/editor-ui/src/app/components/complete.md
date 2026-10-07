## About n8n – OK

- Open the command bar and choose **About n8n**. You can also use Ctrl+Alt+O on a workflow, or the **About n8n** link in the settings sidebar.
- Confirm the version and the license actions. Close the dialog.
- This is a dialog.
- `packages/frontend/editor-ui/src/app/components/AboutModal.vue`

## What’s New

- Open the command bar and choose **What’s New**.
- Confirm the release notes render. Close the dialog.
- This is a dialog.
- `packages/frontend/editor-ui/src/app/components/WhatsNewModal.vue`
- `packages/frontend/editor-ui/src/app/components/WhatsNewModal.test.ts`

## Community nodes

Go to `/settings/community-nodes`.

- Choose **Install**. Enter a package name. The dialog stays open while the install is running. This is a dialog.
- Open an installed package and choose update or uninstall. The confirm dialog lists workflows that use the package. Confirm stays available only when the action allows it. This is a dialog.
- `packages/frontend/editor-ui/src/features/settings/communityNodes/components/CommunityPackageInstallModal.vue`
- `packages/frontend/editor-ui/src/features/settings/communityNodes/components/CommunityPackageManageConfirmModal.vue`

## Personal settings

Go to `/settings/personal`.

- Choose **Change password**. Fill the form and save. Enter in a field submits. This dialog already asks for the current password. It does not open the confirm-password dialog.
- Turn MFA on. The setup dialog shows a spinner while the QR code loads, then the code form, then the recovery codes. This is a dialog.
- With MFA off, change the email and save. The confirm-password dialog opens. Submit returns the password to the page.
- With MFA on, change the email and save, or turn MFA off. The MFA-code dialog opens. Submit returns the code to the page.
- `packages/frontend/editor-ui/src/features/core/auth/components/ChangePasswordModal.vue`
- `packages/frontend/editor-ui/src/features/core/auth/components/MfaSetupModal.vue`
- `packages/frontend/editor-ui/src/features/core/auth/components/PromptMfaCodeModal.vue`
- `packages/frontend/editor-ui/src/features/core/auth/components/ConfirmPasswordModal.vue`
- `packages/frontend/editor-ui/src/features/core/auth/components/ConfirmPasswordModal.test.ts`
- `packages/frontend/editor-ui/src/features/core/auth/components/__snapshots__/ConfirmPasswordModal.test.ts.snap`

## API

Go to `/settings/api`.

- Choose **Create an API key**. Set the label, expiration, and scopes. Save.
- Open an existing key and edit it. Rotate a key when that action is shown. The rotate confirm is a separate alert dialog that already used `N8nAlertDialog`.
- The create and edit form is a dialog. Overlay click does not close it.
- Open an existing key and choose the scopes count. The scopes list is a dialog.
- `packages/frontend/editor-ui/src/features/settings/apiKeys/components/ApiKeyCreateOrEditModal.vue`
- `packages/frontend/editor-ui/src/features/settings/apiKeys/components/ApiKeyScopesModal.vue`

### Chat settings

Go to `/settings/chat`.

- Edit a provider. Change the enabled state and the credential. This is a dialog.
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ProviderSettingsModal.vue`

## Preferences

Go to `/settings/context/preferences` when that page is on.

- Choose **Create preference**, or edit a preference. Confirm the text and the scope. Save, then close.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/settings/context/components/PreferenceModal.vue`

## OpenTelemetry

Go to `/settings/opentelemetry` when that page is on.

- Change a setting and leave the page. The unsaved-changes dialog offers keep editing or leave.
- This is a dialog.
- `packages/modules/otel/frontend/src/SettingsOpenTelemetryView.vue`

### Tags

- Open the workflow tags control and choose **Manage tags**.
- Create a tag, then close the dialog.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/shared/tags/components/TagsManager/TagsManager.vue`

### Workflow menu

Open the workflow menu in the canvas header. The same menu is on a workflow card.

- Choose **Rename**. The name in the header becomes a field. This is not a dialog.
- Choose **Duplicate**. Confirm the name field and the project choice. This is a dialog.
- Choose **Share**. Confirm the project list. This is a dialog. Dismiss runs the close check.
- Choose **Move**. Pick a project. The move button stays disabled until you pick one. This is the same move dialog as the workflow list.
- Choose **Import**, then **From URL**. Paste a URL. This is a dialog.
- Choose **Import**, then **From file**. A file picker opens. This is not a dialog.
- Choose **Export JSON**. The browser downloads a file. This is not a dialog.
- Choose **Settings**. Confirm the settings form, including the error-workflow and timezone controls. This is a dialog.
- Choose **Edit description and tags**. Overlay click does not close it. This is a dialog.
- In that settings dialog, choose **View users with access** when the data redaction notice shows it. The members list is a dialog.
- In that settings dialog, choose **Configure** on **Custom span attributes** when that row is shown. The tag editor is a dialog.
- Choose **Archive** on a published workflow. The confirm opens. An unpublished workflow archives without a confirm.
- Choose **Delete**. The confirm opens. Confirm **Delete**.
- Choose **Push** when source control is connected. Same push dialog as Environments.
- `packages/frontend/editor-ui/src/features/workflows/components/DuplicateWorkflowDialog.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowShareModal.ee.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowShareModal.ee.test.ts`
- `packages/frontend/editor-ui/src/features/workflows/components/ImportWorkflowUrlModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/ImportWorkflowUrlModal.test.ts`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowSettings/WorkflowSettings.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowSettings/WorkflowSettings.test.ts`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowSettings/RedactionMembersModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowSettings/WorkflowCustomTelemetryTags.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowDescriptionModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowDescriptionModal.test.ts`
- `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.vue`
- `packages/frontend/editor-ui/src/app/components/MainHeader/ActionsDropdownMenu.vue`

Things to check:

Scrolling
Escape
Focus

## API

Go to `/settings/api`. Create, edit, and the scopes list are in `complete.md`.

- Open a key menu and choose **Revoke**. Confirm **Revoke**. This is an alert dialog. **Revoke** is red.
- Open a key menu and choose **Rotate** when the key is not expired. Confirm **Rotate**. This is an alert dialog.
- Open a key you cannot edit. **Revoke** in that dialog opens the same revoke confirm.
- `packages/frontend/editor-ui/src/features/settings/apiKeys/components/RevokeApiKeyConfirmModal.vue`
- `packages/frontend/editor-ui/src/features/settings/apiKeys/components/RotateApiKeyConfirmModal.vue`

## Security

Go to `/settings/security`. The sidebar label is **Security & policies**. You need permission to manage security settings.

- Turn off **Publishing workflows**. The confirm opens. This is an alert dialog.
- Turn off **Sharing workflows and credentials**. The confirm opens. This is an alert dialog.
- Turn on **Enforce data redaction**, then turn it off. Each change opens a confirm. Both are alert dialogs.
- Turn off **Enable workflow reviews** when that row is shown. The confirm opens. This is an alert dialog.
- `packages/frontend/editor-ui/src/features/settings/security/SecuritySettings.vue`
- `packages/frontend/editor-ui/src/features/settings/security/DataRedactionSection.vue`
- `packages/frontend/editor-ui/src/features/settings/security/WorkflowReviewsSection.vue`


## Dialog components

These files are the dialog itself. Check them in Storybook.

- Open **Core/Dialog**. Confirm the default dialog, the sizes, the **Form** story, and the **No Close On Overlay Click** story. The close button sits on the title row. Tab reaches it last.
- In the **No Close On Overlay Click** story, click the overlay. The dialog stays open. Escape and the close button still close it.
- In the **Form** story, open the role select and choose an option. The dialog stays open.
- Open **Core/AlertDialog**. Confirm Cancel and the action. There is no close button.
- Open **Areas/Settings/Examples** and the **Model Context Protocol** story. Confirm those dialogs render. The form sits in the dialog body.
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/Dialog.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/DialogBody.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/DialogClose.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/DialogContent.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/DialogDescription.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/DialogFooter.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/DialogHeader.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/dialogContext.ts`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/index.ts`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/Dialog.stories.ts`
- `packages/frontend/@n8n/design-system/src/components/N8nDialog/Dialog.test.ts`
- `packages/frontend/@n8n/design-system/src/components/N8nAlertDialog/AlertDialog.vue`
- `packages/frontend/@n8n/design-system/src/components/N8nSettingsLayout/Examples.stories.ts`


## Workflow list

Go to `/home/workflows` or `/projects/<projectId>/workflows`.

- Open a workflow card menu and choose **Duplicate** or **Share**. Same dialogs as the canvas menu.
- Open a workflow card menu and choose **Move**. Pick a project. The move button stays disabled until you pick one. This is a dialog.
- Open a folder menu and choose **Delete**. Pick transfer or delete, then confirm. Delete stays disabled until the form is valid. This is a dialog.
- Open a folder menu and choose **Move**. Pick a destination. This is a dialog.
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectMoveResourceModal.vue`
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectMoveResourceModal.test.ts`
- `packages/frontend/editor-ui/src/features/core/folders/components/DeleteFolderModal.vue`
- `packages/frontend/editor-ui/src/features/core/folders/components/MoveToFolderModal.vue`


## Data tables

Go to `/projects/<projectId>/datatables`.

- Choose **Create**. You can also open `/projects/<projectId>/datatables/new`. Pick blank or CSV import. Closing the import path returns you to the list. This is a dialog.
- Open a data table card menu and choose **Import CSV**. Pick a file. Import stays disabled until a file is chosen. This is a dialog.
- Choose **Download CSV**. Confirm the checkbox and the download. This is a dialog.
- `packages/frontend/editor-ui/src/features/core/dataTable/components/AddDataTableModal.vue`
- `packages/frontend/editor-ui/src/features/core/dataTable/components/ImportCsvModal.vue`
- `packages/frontend/editor-ui/src/features/core/dataTable/components/ImportCsvModal.test.ts`
- `packages/frontend/editor-ui/src/features/core/dataTable/components/DownloadDataTableModal.vue`
- `packages/frontend/editor-ui/src/features/core/dataTable/components/DownloadDataTableModal.test.ts`


## Users – OK

Go to `/settings/users`.

- Choose **Invite**. Add an email and send the invite. This is a dialog.
- Delete has two layouts. The dialog checks the user's first name. A pending invite has no first name, so it uses the short layout. A user who has signed in has a first name, so it uses the choices.
- Pending invite: send an invite, leave it unaccepted, open that row's menu, and choose **Delete**. The dialog says "Are you sure you want to delete this invited user?" There are no choices. **Delete** is enabled and red.
- Named user: sign in as a second user so the account has a first name, then sign back in as an admin. Open that user's menu and choose **Delete**. The dialog says "What should we do with their data?" and shows two choices, with space between the question, the choices, and the field under the selected choice.
- Choose **Transfer their workflows, credentials and data tables to another user or project**. A project field appears under that choice. **Delete** stays disabled until a project is selected.
- Choose **Delete their workflows, credentials and data tables**. A field appears under that choice. Type `delete all data`. **Delete** stays disabled until the text matches.
- **Delete** is red. This is a dialog. Enter does not submit. Close the dialog without confirming if you do not want to remove the user.
- Open a user who belongs to more than one project. Choose the project count in the projects column. The project list is a dialog.
- `packages/frontend/editor-ui/src/features/settings/users/components/InviteUsersModal.vue`
- `packages/frontend/editor-ui/src/features/settings/users/components/InviteUsersModal.test.ts`
- `packages/frontend/editor-ui/src/features/settings/users/components/DeleteUserModal.vue`
- `packages/frontend/editor-ui/src/features/settings/users/components/DeleteUserModal.test.ts`
- `packages/frontend/editor-ui/src/features/settings/users/components/SettingsUsersProjectsModal.vue`

## Insights

Go to `/insights` on a plan that does not include Insights.

- Choose the upgrade action when the page shows it. The dialog lists the plan benefits. This is a dialog.
- `packages/modules/insights/frontend/src/components/InsightsUpgradeModal.vue`

### Extract a sub-workflow

- Select nodes on the canvas and choose **Convert to sub-workflow**.
- The name dialog stays open when you click the overlay. Enter a name and confirm.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowExtractionNameModal.vue`
- `packages/frontend/editor-ui/src/features/workflows/components/WorkflowExtractionNameModal.test.ts`

## Projects

Open a project and go to its settings.

- Choose **Delete project**. With resources in the project, pick transfer or wipe. Delete stays disabled until the form is valid. This is a dialog.
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectDeleteDialog.vue`

## Variables

Go to `/projects/<projectId>/variables`.

- Choose **Create**. Save a variable. The dialog stays open while the save is running.
- Open a variable and edit it.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/settings/environments.ee/components/VariableModal.vue`
- `packages/frontend/editor-ui/src/features/settings/environments.ee/components/VariableModal.test.ts`

## Log streaming

Go to `/settings/log-streaming`.

- Choose **Add destination**. Pick Webhook, Sentry, or Syslog.
- For Webhook, change the method and the query, header, and option fields. The destination title sits in the dialog header, with space before the form.
- For Syslog, change the protocol and the facility.
- Save, then close. Close runs the close check.
- This is a dialog.
- `packages/frontend/editor-ui/src/features/integrations/logStreaming.ee/components/EventDestinationSettingsModal.vue`
