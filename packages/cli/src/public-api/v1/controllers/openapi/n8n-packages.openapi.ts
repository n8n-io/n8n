export const IMPORT_TAGS = ['N8nPackage'];

export const IMPORT_SUMMARY = 'Beta: Import an n8n package into a project';
export const IMPORT_DESCRIPTION =
	'**Beta** — breaking changes may still occur without major version bump.\n\n' +
	'Imports a gzip-compressed tar package (`.n8np`) into the target project. Send the ' +
	'archive as the multipart field `package`. Optional routing uses form fields `projectId` ' +
	'and `folderId` (omit or send empty for defaults). Every optional mode/policy field ' +
	'(credential, workflow, project, folder, data table, variable, and tag) takes its default ' +
	'when omitted; the one non-fixed default is `folderConflictPolicy`, which follows ' +
	'`projectConflictPolicy` on a project package. The required `workflowConflictPolicy` ' +
	'field controls what happens when a package workflow matches an existing workflow by ' +
	'source id in the target project. Maximum upload size is `N8N_ENDPOINTS_PAYLOAD_SIZE_MAX` ' +
	'MB (default 16).\n\n' +
	'The package must declare its manifest at `manifest.json` and include every file the ' +
	'manifest references.\n\n' +
	'Credential references are resolved before any workflow is written.';

export const IMPORT_409_DESCRIPTION =
	'Import blocked by at least one conflict among the issues — a workflow source-id conflict, ' +
	'a folder conflict, a tag conflict (rename drift or name collision), a data table conflict ' +
	'(id owned by another project, or a name that another table in the project has), a variable ' +
	'whose bundled value differs from the resolved target, or a selected destination also named ' +
	'for deletion.';
export const IMPORT_422_DESCRIPTION =
	'Import blocked by non-conflict issues only — for example unresolved credentials or ' +
	'variables, node types this instance does not have, a delete the caller may not perform, or ' +
	'variable stubs whose creation would exceed the instance variable quota.';

export const IMPORT_SELECTION_SUMMARY =
	'Beta: Import a selected subset of workflows from an n8n package';
export const IMPORT_SELECTION_DESCRIPTION =
	'**Beta** — breaking changes may still occur without major version bump.\n\n' +
	'Imports a chosen subset of workflows from one source project of a gzip-compressed tar ' +
	'package (`.n8np`), instead of the whole package. Send the archive as the multipart field ' +
	'`package`. The import is **additive** (cherry-pick): it never removes a workflow the ' +
	'selection omits. It creates or updates only the workflows named in ' +
	'`selectedWorkflowIds`, and deletes only the destination workflows named in ' +
	'`deletedWorkflowIds`.\n\n' +
	'`selectedProjectId` names the single source project the selection is scoped to (its id ' +
	'as it appears in the package). The selected workflows are written into the instance ' +
	'project whose id matches that source project, which is created if it does not yet exist; ' +
	'there is no separate target-project field. `selectedWorkflowIds` are source ids within ' +
	'that project; ids that belong to another project are dropped. `deletedWorkflowIds` are ' +
	'destination ids in the same project; an absent id is a tolerated no-op, and a delete ' +
	'needs the `workflow:delete` scope. A delete id must not match the destination id of a ' +
	'selected workflow, including when `workflowConflictPolicy=skip`. This overlap returns a ' +
	'409 before any writes.\n\n' +
	'The package must be a project package (a workflow package is rejected with a 400). The ' +
	'cherry-pick conflict policies (folder, tag, and project) are fixed and are not accepted ' +
	'here; only `workflowConflictPolicy`, `workflowIdPolicy`, and `overwriteDeletionPolicy` ' +
	'are configurable. Maximum upload size is `N8N_ENDPOINTS_PAYLOAD_SIZE_MAX` MB (default ' +
	'16). The caller is authorised through the `workflow:import` scope.';

export const IMPORT_SELECTION_409_DESCRIPTION =
	'Import blocked by at least one conflict among the issues — for example a workflow ' +
	'source-id conflict under `workflowConflictPolicy=fail`, or a selected destination also ' +
	'named for deletion (`workflow-removal-conflict`).';
export const IMPORT_SELECTION_422_DESCRIPTION =
	'Import blocked by non-conflict issues only — for example a delete the caller may not ' +
	'perform (`workflow-removal-forbidden`), unresolved credentials, or node types this ' +
	'instance does not have.';
