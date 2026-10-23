Local QA notes for this branch.

This branch replaces every `ElRadio` and `ElRadioGroup` with `N8nRadioGroup`. Pick one option in each group below. Confirm the follow-up fields, the saved choice, and that a second option replaces the first.

## Delete a user

Go to `/settings/users`. Open the menu on a user and choose **Delete**.

- **Transfer their workflows, credentials and data tables to another user or project** reveals the project picker.
- **Delete their workflows, credentials and data tables** reveals the confirmation field. The delete button stays disabled until the text matches.
- `packages/frontend/editor-ui/src/features/settings/users/components/DeleteUserModal.vue`

## Delete a project

Open a project. Go to project settings and choose **Delete**.

- A project with workflows or credentials asks you to transfer them or wipe them.
- Transfer reveals the project picker. Wipe reveals the confirmation field.
- An empty project has no radios. It only asks you to confirm.
- `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectDeleteDialog.vue`

## Delete a folder

Open a project. Open a folder menu and choose **Delete**.

- Transfer moves the contents. The folder picker appears.
- **Archive all workflows and delete subfolders** reveals the confirmation field.
- `packages/frontend/editor-ui/src/features/core/folders/components/DeleteFolderModal.vue`

## Add a data table

Go to a project's data tables and choose **Add**.

- **From scratch** keeps the name field and creates an empty table.
- **Import CSV** reveals the file drop area. Create stays disabled until a file is chosen.
- `packages/frontend/editor-ui/src/features/core/dataTable/components/AddDataTableModal.vue`

## Chat card

Open an agent chat that shows a card with radio options.

- The options are a single group. Choosing one submits that value.
- A description sits under its label.
- A disabled card does not submit.
- `packages/frontend/editor-ui/src/features/agents/components/interactive/N8nChatActionCard.vue`
