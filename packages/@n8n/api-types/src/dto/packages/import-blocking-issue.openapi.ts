import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const workflowConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A workflow whose source id already matches one in the target project, under the `fail` ' +
		'conflict policy.',
};

export const workflowLineageConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A package workflow whose source id matches multiple workflows in the target project. ' +
		'The import cannot choose a workflow safely.',
};

export const workflowIdConflictFieldDocs = {
	existingProjectId: {
		description:
			'Project that owns the existing workflow, or null when no owning project could be ' +
			'determined.',
	},
	isArchived: { description: 'Whether the existing workflow is archived.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowIdConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A `source`-policy workflow whose id is already taken on the instance. Workflow ids are ' +
		'globally unique, so the id cannot be created in the target project. The existing ' +
		'workflow can be in another project, can lack an owner share, or can use a different ' +
		'source id. It can also be archived.',
};

export const workflowFolderConflictFieldDocs = {
	existingParentFolderId: {
		description:
			'Folder that currently contains the matched workflow, or null when it lives at the ' +
			'project root.',
	},
	targetFolderId: { description: 'Folder the import was requested to land in.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowFolderConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A workflow whose source id already matches one in the target project but lives outside ' +
		'the requested import folder. Folder-targeted imports cannot update workflows in place at ' +
		'a different location.',
};

export const workflowArchiveForbiddenFieldDocs = {
	projectId: { description: 'Project that owns the matched workflow.' },
	transition: {
		description: "The step the import needs to bring the workflow to the package's state.",
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowArchiveForbiddenIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A matched workflow whose archived state differs from the package, so the import must ' +
		'archive or unarchive it, but the caller lacks `workflow:delete` on it. Reported at plan ' +
		'time so nothing is written.',
};

export const credentialUnresolvedFieldDocs = {
	targetId: { description: 'Target credential id for an explicit credential binding.' },
	expectedType: {
		description: "For `type_mismatch`: the credential type the package's workflow node requires.",
	},
	actualType: {
		description: 'For `type_mismatch`: the actual type of the resolved target credential.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const credentialUnresolvedIssueOpenApi: ZodOpenAPIMetadata = {
	description: 'A credential reference that could not be resolved in the target project.',
};

export const projectConflictFieldDocs = {
	name: { description: "The project's name as it appears in the package." },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const projectConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A project defined by the package that already exists on this instance, under ' +
		'`projectConflictPolicy=fail`.',
};

export const folderConflictFieldDocs = {
	existingParentFolderId: {
		description: "For `parent-mismatch`: the matched folder's current parent in the target.",
	},
	expectedParentFolderId: {
		description: 'For `parent-mismatch`: the parent the package would place the folder under.',
	},
	existingProjectId: {
		description: 'For `id-in-other-project`: the project that already owns the id.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const folderConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A package folder that cannot be imported as-is. `kind` distinguishes the cause: ' +
		'`parent-mismatch` (a folder matched by id sits under a different parent than the package ' +
		'places it), `id-in-other-project` (the folder id already exists in a different project — ' +
		'ids are globally unique), or `fail-policy` (the folder already exists and ' +
		'`folderConflictPolicy` is `fail`).',
};

export const workflowRemovalForbiddenFieldDocs = {
	projectId: { description: 'Project the workflow was being reconciled against.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowRemovalForbiddenIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A workflow the import would remove but the caller lacks `workflow:delete` on: either ' +
		'`folderConflictPolicy=overwrite` would remove it because the package does not contain it, ' +
		"or it is named in the selection's `deletedWorkflowIds`. Reported instead of removing a " +
		'subset, which would leave the project matching neither the package nor its previous state.',
};

export const workflowRemovalConflictFieldDocs = {
	workflowId: { description: 'The destination id of the selected workflow.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowRemovalConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A selected workflow resolves to a destination id in `deletedWorkflowIds`. The import ' +
		'stops before any writes, including when the conflict policy is `skip`.',
};

export const folderRemovalForbiddenFieldDocs = {
	projectId: { description: 'Project the folder was being reconciled against.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const folderRemovalForbiddenIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A folder that `folderConflictPolicy=overwrite` would delete — the package does not ' +
		'define it and reconciliation leaves it empty — but the caller lacks `folder:delete` on ' +
		'the target project. Reported instead of removing a subset, which would leave the project ' +
		'matching neither the package nor its previous state.',
};

export const dataTableUnresolvedFieldDocs = {
	sourceId: {
		description: 'Absent for import-wide failures (`module-disabled`, `permission-denied`).',
	},
	existingProjectId: {
		description: 'For `id-conflict`: the project owning the conflicting target table.',
	},
	missingColumns: {
		description: 'For `schema-incompatible`: package columns absent from the target table.',
	},
	typeMismatches: {
		description: 'For `schema-incompatible`: package columns whose target type differs.',
	},
	extraColumns: {
		description:
			'For `schema-incompatible` under the `fail` policy: target columns not in the package ' +
			'schema.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableUnresolvedIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		"A data table referenced by the package's workflows that could not be resolved against " +
		'the target project, under `dataTableMissingMode=must-preexist` or ' +
		'`dataTableSchemaConflictPolicy`.',
};

export const tagUnresolvedFieldDocs = {
	sourceId: { description: 'Tag id as it appears in the package. Absent for `permission-denied`.' },
	name: { description: 'The (trimmed) package tag name. Absent for `permission-denied`.' },
	missingScope: {
		description: 'For `permission-denied`: the global scope the importing user lacks.',
	},
	existingTagId: {
		description:
			'Id of the contested target tag — the different tag currently holding the wanted ' +
			'name, or the target tag a blocked reconcile would re-key. Absent when two package ' +
			'tags collide with each other rather than over a target tag.',
	},
	existingName: {
		description: 'For `rename-drift`: the current name of the same-id target tag.',
	},
	usedByWorkflows: {
		description:
			'Package workflow ids (non-skipped) that reference the source tag — not workflows ' +
			'attached to the contested target tag.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const tagUnresolvedIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		"A tag referenced by the package's workflows that could not be resolved on the target " +
		'instance. `kind` distinguishes the cause: `rename-drift` (the same-id target tag carries ' +
		'a different name — under `tagConflictPolicy=fail`, or `rename` when the package name is ' +
		'held by another tag), `name-collision` (the id is free but the name belongs to a ' +
		'different tag under `tagMissingMode=create` with `tagConflictPolicy=fail`; also raised ' +
		'when two package tags collide with each other, or when the target tag a reconcile would ' +
		're-key is claimed by another package tag), `invalid-name` / `invalid-id` (the package ' +
		"tag's name or id cannot be written on this instance), or `permission-denied` (the " +
		'importing user lacks the global `tag:create` / `tag:update` scope the plan needs).',
};

export const variableUnresolvedFieldDocs = {
	name: { description: 'Requirement name with no match in the target project or global scope.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const variableUnresolvedIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A variable reference that could not be resolved in the target project or the global ' +
		'scope, under `variableMissingMode=must-preexist`.',
};

export const variableConflictFieldDocs = {
	name: { description: 'Name of the variable whose value differs.' },
	projectId: {
		description:
			'Project owning the resolved variable. Absent when it resolved at the global scope.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const variableConflictIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A variable that resolved in the target project or the global scope, but whose value ' +
		'differs from the one the package bundles for it, under `variableConflictPolicy=fail`. ' +
		'Also reported under `overwrite`, once per scope, when the projects of a package resolve ' +
		'one row and disagree about the value it should hold. Values are never reported — only the ' +
		'name and the scope the variable was found in.',
};

export const variableLimitExceededFieldDocs = {
	limit: { description: 'The instance variable quota.' },
	remaining: {
		description:
			'Variable rows still available under the quota. The import is blocked because ' +
			'`requested` exceeds this, not because it exceeds `limit`.',
	},
	requested: {
		description: 'Number of new variable rows the import would create (destination-deduplicated).',
	},
	names: { description: 'The unique variable names the import would create.' },
	usedByWorkflows: {
		description: 'Package workflow ids that reference any of the listed variables.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const variableLimitExceededIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		"Creating the package's variables under `create-stub` or `create-with-value` would " +
		'exceed the instance variable quota (`quota:maxVariables`). Reported once for the whole ' +
		'import; nothing is created.',
};

export const missingNodeTypeFieldDocs = {
	nodeType: { description: "Full node type name as used by the package's workflows." },
	typeVersion: { description: "Node type version the package's workflows use." },
	usedByWorkflows: { description: 'Package workflow ids that use this node type and version.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const missingNodeTypeIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A node type — or a version of a node type — used by a package workflow that this ' +
		'instance does not have, under `missingNodeTypeMode=fail`. One issue is reported per ' +
		'missing `(nodeType, typeVersion)` pair.',
};

export const policyViolationFieldDocs = {
	sourceWorkflowId: { description: 'Workflow id as it appears in the package.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const policyViolationIssueOpenApi: ZodOpenAPIMetadata = {
	description:
		'A workflow the content-import policy refused. Takes down the whole package rather than ' +
		'skipping the workflow: the import rewrites cross-workflow references to the ids each ' +
		'workflow would get, so dropping one leaves the workflows that call it pointing at a row ' +
		'nothing ever wrote.',
};
