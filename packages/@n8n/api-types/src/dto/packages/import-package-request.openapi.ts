import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const importPackageRequestFieldDocs = {
	package: { description: 'Gzip-compressed tar package (`.n8np`).' },
	projectId: {
		description:
			"Target project id. Omit or send empty to import into the caller's personal project.",
	},
	folderId: {
		description: 'Optional folder within the target project. Omit or send empty for project root.',
	},
	credentialMatchingMode: {
		description:
			'How credential references in `requirements.credentials` are matched on the target ' +
			'instance. `id-only` (default) matches by id. `name-and-type` matches credentials with ' +
			'the exact same name and type. `type-only` matches any credential of the same type. For ' +
			'`name-and-type` and `type-only`, candidates are ranked by scope — a credential owned by ' +
			'the target project wins over one merely shared into it, which in turn wins over a ' +
			'global credential; if several candidates remain in the winning scope, the most recently ' +
			'updated one is chosen.',
	},
	credentialMissingMode: {
		description:
			'What to do when a credential reference cannot be resolved. `create-stub` (default) ' +
			'creates empty credential placeholders in the target project for missing references. ' +
			'`create-with-values` also creates them, seeded from the expression data bundled in the ' +
			'package (see the export option `credentialExportPolicy`); a reference the package ' +
			'carries no data for falls back to an empty stub. A credential created with package data ' +
			'is listed under `credentials.seeded` when the package confirms that all source data ' +
			'was retained. ' +
			'Otherwise, also when the package has no completeness flag, it is listed under ' +
			'`credentials.incomplete` and blocks workflow publishing with `incomplete-credential`. ' +
			'`create-with-values` requires the `credential:create` scope when the import creates ' +
			'a credential. ' +
			'`must-preexist` requires every referenced credential to already exist.',
	},
	credentialConflictPolicy: {
		description:
			'What to do when a credential reference matches an existing credential and the package ' +
			'has different values for it. `keep-existing` (default) never changes a matched ' +
			'credential. `overwrite` writes the package name and the expression values from the ' +
			'package to a matched credential that a project of the import owns. It keeps all other ' +
			'stored values: secrets, other fields, the OAuth connection, and array fields. It never ' +
			'changes a global credential that a different project owns, or a managed, end-user ' +
			'(resolvable) or instance-level credential. The import lists the source ids of changed ' +
			'credentials under `credentials.updated`. An API key needs the `credential:update` scope ' +
			'when the import changes a credential. `fail` rejects the import with a 409 ' +
			'(`credential-conflict`) when `overwrite` would change a matched credential. Every policy ' +
			'leaves a matched credential alone when the package values are the same as the stored ' +
			'values. `overwrite` and `fail` compare stored values, so they need the ' +
			'`credential:update` permission on each matched credential that a project of the import ' +
			'owns, also when it would not change. Without it, the import is rejected with ' +
			'`credential-update-forbidden`.',
	},
	bindings: {
		type: 'string',
		default: '{}',
		description:
			'Optional JSON object of explicit source→target id bindings, keyed by entity type. Only ' +
			'`credentials` is supported today: send `{"credentials":{"<packageCredentialId>":' +
			'"<targetCredentialId>"}}` to map credential ids from the package to credential ids on ' +
			'the target instance. These explicit bindings are validated on type and applied before ' +
			'`credentialMatchingMode` resolution runs.',
	},
	conflictPolicy: {
		description:
			'Applies to Agents, workflows and the skills of imported Agents. `new-version` replaces ' +
			'matched definitions and saves a changed skill as a new version. ' +
			'`fail` rejects the import when an Agent or workflow matches, or when a matched skill ' +
			'has other content. A matched skill with the same content is kept. ' +
			'`skip` leaves matched definitions and skills unchanged. ' +
			'All policies create entities and skills that have no match. ' +
			'A new version of a project or instance skill applies to all Agents on the instance that ' +
			'follow the skill, also Agents that are not in the package. ' +
			'A skill conflict under `fail` is an `agent-invalid` issue, so it returns 422. ' +
			'Matched workflows also follow the package ' +
			'archive state under `new-version`; this change needs `workflow:delete`. ' +
			'This required field replaces `workflowConflictPolicy`. The old field is rejected.',
	},
	publishingPolicy: {
		description:
			'Controls publication of imported Agents and workflows after definitions are saved. ' +
			'`preserve-published-state` (default) keeps new entities unpublished. It republishes an ' +
			'updated entity only if it was published and the package contains the version published ' +
			'at the source. `match-source` publishes the imported definition when the source publishes ' +
			'it. It unpublishes the destination when the source has no published version. Both policies ' +
			'leave publication unchanged when the source publishes a version absent from the package. ' +
			'`publish-all` requests publication of imported entities. `unpublish-all` leaves new ' +
			'entities unpublished and unpublishes updated entities. Skipped entities remain unchanged. ' +
			'Archived workflows remain unpublished. Publication failures do not undo saved definitions. ' +
			'Only the Agent revision saved by the import can be published or unpublished. ' +
			'This field replaces `workflowPublishingPolicy` and `agentPublishingPolicy`. The old fields are rejected.',
	},
	idPolicy: {
		description:
			'Controls IDs for newly created Agents and workflows. Only `source` is supported. ' +
			'It uses the package ID. An ID already used by an unmatched Agent or workflow, in any project, ' +
			'blocks the import. ' +
			'Matched entities keep their destination ID. Agent and workflow identity maps remain separate. ' +
			'This field replaces `workflowIdPolicy` and `agentIdPolicy`. The old fields are rejected.',
	},
	missingNodeTypeMode: {
		description:
			'Controls missing node types and versions in workflow nodes and Agent node tools. ' +
			'`fail` (default) rejects the import before writes. The issues identify the affected ' +
			'consumers. `import-anyway` saves the definitions but blocks their publication. ' +
			'This applies to both Agents and workflows.',
	},
	projectConflictPolicy: {
		description:
			'What to do when a project the package defines already exists here (matched by id), and ' +
			'— unless `folderConflictPolicy` overrides it — how its contents are treated. `merge` ' +
			"(default) leaves the existing project's name, description, icon and custom span " +
			"attributes untouched and adds the package's contents alongside. `overwrite` replaces " +
			"those details with the package's; a detail the package omits is left as it is, not " +
			'cleared. `fail` rejects the import before anything is written, with one `project-conflict` ' +
			'issue per existing project. A package project id belonging to a personal project, or to ' +
			'a team project the caller cannot update, always rejects the import. Ignored for workflow ' +
			'packages.',
	},
	folderConflictPolicy: {
		description:
			'What to do when a package folder already exists at the same position in the target ' +
			'project. Defaults to whatever `projectConflictPolicy` is, so the intent is stated once; ' +
			'a workflow package defines no projects, so it defaults to `merge` there. `merge` reuses ' +
			"the existing folder and merges the package's children into it. `fail` rejects the " +
			'import. `overwrite` reuses folders as `merge` does and additionally removes workflows ' +
			"the package does not contain — at a project's root and in folders the package defines, " +
			'leaving target-only folders and their contents alone. Folders it does not define are ' +
			'then removed too, but only once nothing is left inside them. Removals are listed under ' +
			'`removedWorkflows` and `removedFolders`; see `overwriteDeletionPolicy`. A folder whose ' +
			'id sits under a different parent, or belongs to another project, always blocks the ' +
			'import. `overwrite` is project-packages-only, needs the `workflow:delete` and ' +
			'`folder:delete` scopes, is rejected against a `projectConflictPolicy` other than ' +
			'`overwrite`, and blocks up front if the caller cannot delete something it would remove. ' +
			'Folders need the `folder:create` scope and a folders-enabled licence.',
	},
	overwriteDeletionPolicy: {
		description:
			'How `folderConflictPolicy=overwrite` removes a workflow the package does not contain. ' +
			'`archive` (default) archives it, so it stays recoverable along with its execution ' +
			'history. `hard-delete` archives it — the step that unpublishes it, which a delete will ' +
			'not do on its own — and then deletes the workflow and its executions permanently. Each ' +
			'entry in `removedWorkflows` reports what actually happened in its `deletion` field: a ' +
			'`hard-delete` whose row cannot be dropped yet, because unpublishing defers trigger ' +
			'teardown, is left `archived` rather than failing an import whose content is already ' +
			'written. Ignored unless `folderConflictPolicy` is `overwrite`.',
	},
	dataTableMatchingMode: {
		description:
			"How data tables referenced by the package's workflows are matched against the target " +
			'project. `by-id` matches the target-project table with the same id (imported tables ' +
			'keep their source id) and never falls back to name matching, so a match survives a ' +
			'rename on the target. Currently the only mode.',
	},
	dataTableMissingMode: {
		description:
			'Controls what happens when a referenced data table has no match in the target ' +
			'project. `create` (default) creates it from the package schema, keeping the source ' +
			'id, with no rows; requires the `dataTable:create` scope. `must-preexist` rejects the ' +
			'import. `do-nothing` skips creation of missing tables. Under the `keep-existing`, ' +
			'`fail`, and `overwrite-non-destructive` schema conflict policies, matched tables are ' +
			'still validated for schema compatibility and can still block the import. The import ' +
			'never imports table rows. Matched tables change only under ' +
			'`dataTableSchemaConflictPolicy=overwrite` or `overwrite-non-destructive`, which keep ' +
			'their rows.',
	},
	dataTableSchemaConflictPolicy: {
		description:
			"How strictly a matched data table's schema is compared. `keep-existing` (default) " +
			'accepts a target table that has every package column with the same name and type. The ' +
			'target table can have extra columns. `fail` rejects any difference, including ' +
			'target-only columns. Under `keep-existing` and `fail`, a missing package column or a ' +
			'type mismatch rejects the import, and the target table does not change.\n\n' +
			'`overwrite` changes the matched target table to match the package. It can remove or ' +
			'retype columns. The values in those columns are removed. Rows and other columns are ' +
			'kept. When the package has column ids, a column that is only renamed keeps its ' +
			'values. The changes apply to all workflows that use the table. A blocked ' +
			'`keep-existing`, `fail`, or `overwrite-non-destructive` import lists them in ' +
			'`overwriteChanges`. Requires the `dataTable:update` scope only when a matched table ' +
			'changes.\n\n' +
			'`overwrite-non-destructive` makes the same changes as `overwrite`, but rejects the ' +
			'import and writes nothing when a change removes or retypes a column. A target-only ' +
			'column counts as removed.',
	},
	variableMissingMode: {
		description:
			"Controls what happens when a variable referenced by the package's workflows is absent " +
			'from the target project and the global scope (lookup order: project, then global). ' +
			'`create-with-value` (default) creates the variable with its package value and lists its ' +
			'name under `variables.created`. When the package carries no value for it — values were ' +
			'excluded at export, or the exported value was itself empty — it creates an empty stub ' +
			'listed under `variables.stubbed`. `do-nothing` imports without creating the variable and ' +
			'lists its name under `variables.missing`. `must-preexist` rejects the import unless every ' +
			'referenced variable already resolves. `create-stub` creates each missing variable with an ' +
			'empty value at the placement scope (see `variableParentPolicy`) and lists the created ' +
			'names under `variables.stubbed`. An import that actually creates a variable requires a ' +
			'license that permits variables and, for API key callers, the `variable:create` scope; a ' +
			'package whose variables all already resolve creates nothing and needs neither.',
	},
	variableConflictPolicy: {
		description:
			'What to do when a referenced variable resolves in the target project or global scope ' +
			'but the package bundles a *different* value for it. `keep-existing` (default) leaves the ' +
			'target value untouched and reports the name under `variables.matched`. `overwrite` ' +
			'silently replaces the value of the existing variable at whichever scope it was found — ' +
			'the target project or the global scope, so a global variable other projects also read ' +
			'can be rewritten by this import — and reports the name under `variables.updated`; it ' +
			'needs a license that permits variables, the `variable:update` / `projectVariable:update` ' +
			'permission on that scope, and, for API key callers, the `variable:update` scope. `fail` ' +
			'rejects the import with a 409 instead. Every policy leaves a resolved variable alone when ' +
			'there is nothing to change — either the package bundles no value for it (values were ' +
			'excluded at export, or the exported value was itself empty), or the value it bundles ' +
			"already matches the target's. The reverse does not hold: a resolved variable holding an " +
			'empty value — a stub an earlier import created, say — still counts as a value, so ' +
			'`overwrite` fills it and `fail` rejects it. Under `overwrite`, a project package whose ' +
			'projects hold *different* values for a name they all resolve to one row — a global none ' +
			'of them shadows, typically — is rejected with a 409: one row cannot carry both values, ' +
			'and the import will not pick for you. Give the projects their own variables in the ' +
			'target, or import them separately.',
	},
	variableParentPolicy: {
		description:
			'Where `create-with-value` and `create-stub` create missing variables for workflow/folder ' +
			'packages. `project` — also the behaviour when the field is omitted — creates them in the ' +
			"import target project (`projectId`, else the caller's personal project). `global` " +
			'creates them at the global scope. The license and `variable:create` requirements ' +
			'described under `variableMissingMode` apply to both placements. Must be omitted for ' +
			'project packages, which reject it with a 400: their placement follows the package ' +
			'layout, where a variable bundled under a project is created in that project and one ' +
			'bundled at the top level is created globally.',
	},
	tagMissingMode: {
		description:
			"What to do when a tag referenced by the package's workflows has no tag with the same id " +
			'on the target instance (tags are matched by source id, never by name). `create` ' +
			'(default) creates the tag globally with its package (source) id and name; when the ' +
			'import would create a tag this needs an API key carrying the `tag:create` scope. ' +
			'`do-nothing` imports the workflows without the missing tags — nothing is created and the ' +
			'dropped names are listed under `tags.skipped`.',
	},
	tagConflictPolicy: {
		description:
			'What to do when a referenced tag conflicts on the target instance — either the same-id ' +
			"target tag carries a different name (rename drift), or the tag's name is already held by " +
			'a different tag (name collision). `skip` (default) drops the conflicted tags from the ' +
			'import (not created, not renamed, not attached anywhere; the import proceeds and lists ' +
			'them under `tags.skipped`). `fail` rejects the import with a 409. `rename` renames a ' +
			'drifted target tag to the package name, and reconciles a name collision by re-keying the ' +
			'existing tag to the package (source) id — its name, workflow and folder taggings follow; ' +
			'both need an API key carrying the `tag:update` scope when the import would rename or ' +
			'reconcile a tag. A drifted tag whose package name is held by another tag still rejects ' +
			'the import (rename degrades to fail).',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const importPackageSelectionRequestFieldDocs = {
	selectedProjectId: {
		description:
			'Id of the single source project the selection is scoped to, as it appears in the package.',
	},
	selectedWorkflowIds: {
		type: 'string',
		description:
			'JSON-encoded array of source workflow ids to import from `selectedProjectId`, e.g. ' +
			'`["wf-1","wf-2"]`. An empty array (`[]`) is allowed — useful for a delete-only request. ' +
			'Ids outside the scoped project are dropped.',
	},
	deletedWorkflowIds: {
		type: 'string',
		description:
			'Optional JSON-encoded array of destination workflow ids to remove from the scoped ' +
			'project, e.g. `["wf-3"]`. Removal happens even under the additive profile, and the ' +
			'manner of removal follows `overwriteDeletionPolicy` (archive by default). An absent id ' +
			'is a no-op unless it is also a selected destination. Must not contain a selected ' +
			"workflow's destination id. Needs the `workflow:delete` scope.",
	},
	conflictPolicy: {
		description:
			'What happens when a selected workflow matches an existing workflow by source id in the ' +
			'target project. `new-version` (default) updates it and creates a new version; `fail` ' +
			'rejects the import when any matching workflow exists; `skip` leaves matching workflows ' +
			'unchanged. An archive state change also needs the `workflow:delete` scope.',
	},
	idPolicy: {
		description:
			'Controls IDs for newly created workflows. Only `source` is supported. It uses the package ID. ' +
			'An ID already used by an unmatched workflow, in any project, blocks the import. ' +
			'Matched workflows keep their destination ID.',
	},
	overwriteDeletionPolicy: {
		description:
			'How the ids in `deletedWorkflowIds` are removed. `archive` (default) archives each one, ' +
			'so it stays recoverable along with its execution history. `hard-delete` archives it — ' +
			'the step that unpublishes it, which a delete will not do on its own — and then deletes ' +
			'the workflow and its executions permanently. Each entry in `removedWorkflows` reports ' +
			'what actually happened in its `deletion` field: a `hard-delete` whose row cannot be ' +
			'dropped yet, because unpublishing defers trigger teardown, is left `archived` rather ' +
			'than failing an import whose content is already written.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
