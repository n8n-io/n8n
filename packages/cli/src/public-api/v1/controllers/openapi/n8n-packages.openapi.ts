export const PACKAGE_TAGS = ['N8nPackage'];

export const EXPORT_SUMMARY =
	'Beta: Export agents, workflows, folders, or projects as an n8n package';
export const EXPORT_DESCRIPTION =
	'**Beta** — breaking changes may still occur without major version bump.\n\n' +
	'Export agents, workflows, and folders, or whole projects, as a gzipped tar\n' +
	'archive (.n8np). Provide `agentIds`/`workflowIds`/`folderIds`, or `projectIds`.\n' +
	'Do not combine these two groups. Each exported folder includes its nested\n' +
	'folders. Whole projects include their agents when the agents module is enabled.\n' +
	'Explicit agent selections require the agents module. Empty projects export\n' +
	'project metadata only. `versionPolicy` selects the version for both agents and\n' +
	'workflows and defaults to `latest`. `dependencyPolicy` applies to both entity\n' +
	'types and defaults to `fail` when a required definition is absent from the\n' +
	'package. The response is streamed as `application/gzip` with a `Content-Disposition`\n' +
	'attachment header. Requires the n8n Packages feature to be licensed.\n\n' +
	'API key scopes: `agent:export` is required for explicitly selected agents.\n' +
	'`workflow:export` is required for explicitly selected workflows or folders.\n' +
	'`project:export` is sufficient for whole-project exports, including their\n' +
	'agents and workflows. Included dependencies need no additional API key scope.\n' +
	"The caller's project permissions apply to all included entities. When\n" +
	'`includeVariableValues` is true (the default) and exported entities reference\n' +
	'variables, `variable:list` is also required. Exports that reference no variables\n' +
	'do not need it.\n\n' +
	'Agent definitions include referenced skills, custom tools, and schedules.\n' +
	'Knowledge base files and runtime data are excluded.\n';

export const EXPORT_200_DESCRIPTION =
	'A gzipped tar archive containing the exported package contents.';
export const EXPORT_COUNTS_HEADER_DESCRIPTION =
	'JSON-serialized per-entity counts of what actually ended up in the\n' +
	'package (after folder bundling and auto-inclusion), e.g.\n' +
	'`{"agents":1,"workflows":2,"folders":1,"credentials":0,"dataTables":0,"variables":0,"tags":0}`.\n';

export const IMPORT_SUMMARY = 'Beta: Import an n8n package into a project';
export const IMPORT_DESCRIPTION =
	'**Beta** — breaking changes may still occur without major version bump.\n\n' +
	'Imports Agent-only, workflow-only, mixed, and whole-project packages. The Agents module ' +
	'must be active for packages that contain Agents. Send the gzip-compressed tar ' +
	'archive (`.n8np`) as the multipart field `package`. Optional routing uses form fields `projectId` ' +
	'and `folderId` (omit or send empty for defaults). Every optional mode/policy field ' +
	'(credential, Agent, workflow, project, folder, data table, variable, and tag) takes its default ' +
	'when omitted; the one non-fixed default is `folderConflictPolicy`, which follows ' +
	'`projectConflictPolicy` on a project package. The required `conflictPolicy` ' +
	'field controls matches for both Agents and workflows. It replaces `workflowConflictPolicy`; ' +
	'the old field is rejected. `idPolicy` and `publishingPolicy` also apply to both kinds. ' +
	'They replace the workflow-specific and Agent-specific fields, which are rejected. ' +
	'Maximum upload size is `N8N_ENDPOINTS_PAYLOAD_SIZE_MAX` ' +
	'MB (default 16).\n\n' +
	'The package must declare its manifest at `manifest.json` and include every file the ' +
	'manifest references.\n\n' +
	'Credential and dependency references are resolved before writes. Request bindings support ' +
	'credential overrides only. Agent and workflow identities are matched automatically.\n\n' +
	'Agent packages require `agent:import` and `agent:read`. Workflow packages require ' +
	'`workflow:import`. Mixed packages require both import grants. Planned Agent actions also ' +
	'require `agent:create`, `agent:update`, `agent:publish`, or `agent:unpublish`. Skipped Agents ' +
	'do not require write grants. Creating a project or instance skill requires `skill:create`, ' +
	'and saving a new version of one requires `skill:update`. ' +
	'Destination-project permissions and dependency scopes still apply.\n\n' +
	'The response contains Agent summaries in `agents`, source IDs in `bindings.agents`, and ' +
	'totals in `counts.agents`. Definition import and publication have separate outcomes. ' +
	'Check `agents[].publishing.state` and `workflows[].publishing.state` for publication ' +
	'results, including `failed`. A publication failure retains the imported definition and ' +
	'returns HTTP 200.\n\n' +
	'Selected-Agent exports use this endpoint. Agent content is rejected by `/import-selection`, ' +
	'directory imports, and Promotions before writes.\n\n' +
	'Example multipart fields: `conflictPolicy=new-version`, `idPolicy=source`, ' +
	'`publishingPolicy=match-source`, ' +
	'and `bindings={"credentials":{"source-credential":"target-credential"}}`.';

export const IMPORT_409_DESCRIPTION =
	'Import blocked by at least one conflict among the issues — an Agent or workflow identity conflict, ' +
	'a folder conflict, a tag conflict (rename drift or name collision), a data table conflict ' +
	'(id owned by another project, or a name that another table in the project has), a variable ' +
	'whose bundled value differs from the resolved target, or a selected destination also named ' +
	'for deletion.';
export const IMPORT_422_DESCRIPTION =
	'Import blocked by non-conflict issues only — for example unresolved credentials or ' +
	'variables, invalid Agent definitions or dependencies, node types this instance does not have, ' +
	'a delete the caller may not perform, or ' +
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
	'selected workflow, including when `conflictPolicy=skip`. This overlap returns a ' +
	'409 before any writes.\n\n' +
	'The package must be a project package (a workflow package is rejected with a 400). The ' +
	'cherry-pick conflict policies (folder, tag, and project) are fixed and are not accepted ' +
	'here; only `conflictPolicy`, `idPolicy`, and `overwriteDeletionPolicy` ' +
	'are configurable. Maximum upload size is `N8N_ENDPOINTS_PAYLOAD_SIZE_MAX` MB (default ' +
	'16). The caller is authorised through the `workflow:import` scope. ' +
	'Packages that contain Agents are rejected before writes. Use the ordinary import endpoint ' +
	'for selected-Agent exports. `conflictPolicy` replaces `workflowConflictPolicy`, and ' +
	'`idPolicy` replaces `workflowIdPolicy`. The old fields are rejected. ' +
	'Publication remains fixed to `match-source`.';

export const IMPORT_SELECTION_409_DESCRIPTION =
	'Import blocked by at least one conflict among the issues — for example a workflow ' +
	'source-id conflict under `conflictPolicy=fail`, or a selected destination also ' +
	'named for deletion (`workflow-removal-conflict`).';
export const IMPORT_SELECTION_422_DESCRIPTION =
	'Import blocked by non-conflict issues only — for example a delete the caller may not ' +
	'perform (`workflow-removal-forbidden`), unresolved credentials, or node types this ' +
	'instance does not have.';
