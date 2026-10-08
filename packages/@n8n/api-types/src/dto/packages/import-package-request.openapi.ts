import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

/** Field docs for {@link ImportPackageRequestDto}, kept out of the DTO file for readability. */
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
			'`must-preexist` requires every referenced credential to already exist.',
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
	workflowConflictPolicy: {
		description:
			'`new-version` updates matching workflows and creates a new version; the archived state ' +
			'follows the package, so a matching workflow is archived or unarchived to match it. ' +
			'`fail` rejects the import when any matching workflow exists, and `skip` leaves matching ' +
			'workflows unchanged. Archived workflows in the target project match like any other. An ' +
			'archive state change also needs the `workflow:delete` scope.',
	},
	workflowPublishingPolicy: {
		description:
			'Controls whether imported workflows are published after content is written. ' +
			'`preserve-published-state` (default) keeps new workflows inactive, and republishes an ' +
			'updated workflow only when it was already published and the package carries the ' +
			'version the source publishes — so drafts are never published. `match-source` publishes ' +
			'the version the package carries when the source publishes it, and unpublishes when the ' +
			'source publishes nothing; when the source publishes a version the package does not carry, ' +
			'the target keeps its published version. `publish-all` publishes every imported workflow. ' +
			'`unpublish-all` leaves new workflows inactive and unpublishes updated workflows that ' +
			'were published.',
	},
	workflowIdPolicy: {
		description:
			'Controls the id each newly created workflow receives. `source` (default) reuses the ' +
			"package's own workflow id on the target instance, which best fits promotion use cases " +
			'where the same workflow moves between environments. `new` mints a fresh id and records ' +
			'the package id as `sourceWorkflowId`, so the same package can be imported repeatedly ' +
			'without id collisions — best suited to marketplace imports. Workflows matched to an ' +
			'existing workflow in the target project (status `updated` or `skipped`) always keep that ' +
			"workflow's current id, regardless of policy.",
	},
	missingNodeTypeMode: {
		description:
			'What to do when a workflow in the package uses a node type — or a version of a node ' +
			'type — this instance does not have. `fail` (default) rejects the import before anything ' +
			'is written, listing every missing `(nodeType, typeVersion)` pair and the workflows that ' +
			'use it. `import-anyway` imports the package; workflows containing missing node types are ' +
			'never published by this import, regardless of `workflowPublishingPolicy`.',
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
