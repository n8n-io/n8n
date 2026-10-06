import '../../openapi-extend';

import { z } from 'zod';

import { policyViolationSchema } from '../../schemas/policy-violation.schema';

const workflowConflictIssueSchema = z
	.object({
		type: z.literal('workflow-conflict'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		name: z.string(),
	})
	.openapi({
		description:
			'A workflow whose source id already matches one in the target project, under the `fail` ' +
			'conflict policy.',
	});

const workflowLineageConflictIssueSchema = z
	.object({
		type: z.literal('workflow-lineage-conflict'),
		sourceWorkflowId: z.string(),
		projectId: z.string(),
		existingWorkflows: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				isArchived: z.boolean(),
			}),
		),
	})
	.openapi({
		description:
			'A package workflow whose source id matches multiple workflows in the target project. ' +
			'The import cannot choose a workflow safely.',
	});

const workflowIdConflictIssueSchema = z
	.object({
		type: z.literal('workflow-id-conflict'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		existingProjectId: z
			.string()
			.nullable()
			.openapi({
				description:
					'Project that owns the existing workflow, or null when no owning project could be ' +
					'determined.',
			}),
		isArchived: z.boolean().openapi({ description: 'Whether the existing workflow is archived.' }),
		name: z.string(),
	})
	.openapi({
		description:
			'A `source`-policy workflow whose id is already taken on the instance. Workflow ids are ' +
			'globally unique, so the id cannot be created in the target project. The existing ' +
			'workflow can be in another project, can lack an owner share, or can use a different ' +
			'source id. It can also be archived.',
	});

const workflowFolderConflictIssueSchema = z
	.object({
		type: z.literal('workflow-folder-conflict'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		existingParentFolderId: z
			.string()
			.nullable()
			.openapi({
				description:
					'Folder that currently contains the matched workflow, or null when it lives at the ' +
					'project root.',
			}),
		targetFolderId: z
			.string()
			.openapi({ description: 'Folder the import was requested to land in.' }),
		name: z.string(),
	})
	.openapi({
		description:
			'A workflow whose source id already matches one in the target project but lives outside ' +
			'the requested import folder. Folder-targeted imports cannot update workflows in place at ' +
			'a different location.',
	});

const workflowArchiveForbiddenIssueSchema = z
	.object({
		type: z.literal('workflow-archive-forbidden'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		name: z.string(),
		projectId: z.string().openapi({ description: 'Project that owns the matched workflow.' }),
		transition: z.enum(['archive', 'unarchive']).openapi({
			description: "The step the import needs to bring the workflow to the package's state.",
		}),
	})
	.openapi({
		description:
			'A matched workflow whose archived state differs from the package, so the import must ' +
			'archive or unarchive it, but the caller lacks `workflow:delete` on it. Reported at plan ' +
			'time so nothing is written.',
	});

const credentialUnresolvedIssueSchema = z
	.object({
		type: z.literal('credential-unresolved'),
		kind: z.enum(['not_found', 'unknown_type', 'source_not_found', 'type_mismatch']),
		sourceId: z.string(),
		targetId: z.string().optional().openapi({
			description: 'Target credential id for an explicit credential binding.',
		}),
		expectedType: z.string().optional().openapi({
			description: "For `type_mismatch`: the credential type the package's workflow node requires.",
		}),
		actualType: z.string().optional().openapi({
			description: 'For `type_mismatch`: the actual type of the resolved target credential.',
		}),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi({
		description: 'A credential reference that could not be resolved in the target project.',
	});

const projectConflictIssueSchema = z
	.object({
		type: z.literal('project-conflict'),
		kind: z.literal('fail-policy'),
		sourceProjectId: z.string(),
		name: z.string().openapi({ description: "The project's name as it appears in the package." }),
	})
	.openapi({
		description:
			'A project defined by the package that already exists on this instance, under ' +
			'`projectConflictPolicy=fail`.',
	});

const folderConflictIssueSchema = z
	.object({
		type: z.literal('folder-conflict'),
		kind: z.enum(['parent-mismatch', 'id-in-other-project', 'fail-policy']),
		sourceFolderId: z.string(),
		name: z.string(),
		existingParentFolderId: z.string().nullable().optional().openapi({
			description: "For `parent-mismatch`: the matched folder's current parent in the target.",
		}),
		expectedParentFolderId: z.string().nullable().optional().openapi({
			description: 'For `parent-mismatch`: the parent the package would place the folder under.',
		}),
		existingProjectId: z.string().nullable().optional().openapi({
			description: 'For `id-in-other-project`: the project that already owns the id.',
		}),
	})
	.openapi({
		description:
			'A package folder that cannot be imported as-is. `kind` distinguishes the cause: ' +
			'`parent-mismatch` (a folder matched by id sits under a different parent than the package ' +
			'places it), `id-in-other-project` (the folder id already exists in a different project — ' +
			'ids are globally unique), or `fail-policy` (the folder already exists and ' +
			'`folderConflictPolicy` is `fail`).',
	});

const workflowRemovalForbiddenIssueSchema = z
	.object({
		type: z.literal('workflow-removal-forbidden'),
		workflowId: z.string(),
		name: z.string(),
		projectId: z
			.string()
			.openapi({ description: 'Project the workflow was being reconciled against.' }),
	})
	.openapi({
		description:
			'A workflow the import would remove but the caller lacks `workflow:delete` on: either ' +
			'`folderConflictPolicy=overwrite` would remove it because the package does not contain it, ' +
			"or it is named in the selection's `deletedWorkflowIds`. Reported instead of removing a " +
			'subset, which would leave the project matching neither the package nor its previous state.',
	});

const workflowRemovalConflictIssueSchema = z
	.object({
		type: z.literal('workflow-removal-conflict'),
		sourceWorkflowId: z.string(),
		workflowId: z.string().openapi({ description: 'The destination id of the selected workflow.' }),
		projectId: z.string(),
	})
	.openapi({
		description:
			'A selected workflow resolves to a destination id in `deletedWorkflowIds`. The import ' +
			'stops before any writes, including when the conflict policy is `skip`.',
	});

const folderRemovalForbiddenIssueSchema = z
	.object({
		type: z.literal('folder-removal-forbidden'),
		folderId: z.string(),
		name: z.string(),
		projectId: z
			.string()
			.openapi({ description: 'Project the folder was being reconciled against.' }),
	})
	.openapi({
		description:
			'A folder that `folderConflictPolicy=overwrite` would delete — the package does not ' +
			'define it and reconciliation leaves it empty — but the caller lacks `folder:delete` on ' +
			'the target project. Reported instead of removing a subset, which would leave the project ' +
			'matching neither the package nor its previous state.',
	});

const dataTableUnresolvedIssueSchema = z
	.object({
		type: z.literal('data-table-unresolved'),
		kind: z.enum([
			'missing',
			'id-conflict',
			'name-conflict',
			'schema-incompatible',
			'module-disabled',
			'permission-denied',
		]),
		sourceId: z.string().optional().openapi({
			description: 'Absent for import-wide failures (`module-disabled`, `permission-denied`).',
		}),
		name: z.string().optional(),
		existingProjectId: z.string().optional().openapi({
			description: 'For `id-conflict`: the project owning the conflicting target table.',
		}),
		missingColumns: z.array(z.string()).optional().openapi({
			description: 'For `schema-incompatible`: package columns absent from the target table.',
		}),
		typeMismatches: z
			.array(
				z.object({
					column: z.string(),
					expectedType: z.string(),
					actualType: z.string(),
				}),
			)
			.optional()
			.openapi({
				description: 'For `schema-incompatible`: package columns whose target type differs.',
			}),
		extraColumns: z
			.array(z.string())
			.optional()
			.openapi({
				description:
					'For `schema-incompatible` under the `fail` policy: target columns not in the package ' +
					'schema.',
			}),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi({
		description:
			"A data table referenced by the package's workflows that could not be resolved against " +
			'the target project, under `dataTableMissingMode=must-preexist` or ' +
			'`dataTableSchemaConflictPolicy`.',
	});

const tagUnresolvedIssueSchema = z
	.object({
		type: z.literal('tag-unresolved'),
		kind: z.enum([
			'rename-drift',
			'name-collision',
			'invalid-name',
			'invalid-id',
			'permission-denied',
		]),
		sourceId: z.string().optional().openapi({
			description: 'Tag id as it appears in the package. Absent for `permission-denied`.',
		}),
		name: z.string().optional().openapi({
			description: 'The (trimmed) package tag name. Absent for `permission-denied`.',
		}),
		missingScope: z.enum(['tag:create', 'tag:update']).optional().openapi({
			description: 'For `permission-denied`: the global scope the importing user lacks.',
		}),
		existingTagId: z
			.string()
			.optional()
			.openapi({
				description:
					'Id of the contested target tag — the different tag currently holding the wanted ' +
					'name, or the target tag a blocked reconcile would re-key. Absent when two package ' +
					'tags collide with each other rather than over a target tag.',
			}),
		existingName: z.string().optional().openapi({
			description: 'For `rename-drift`: the current name of the same-id target tag.',
		}),
		usedByWorkflows: z.array(z.string()).openapi({
			description:
				'Package workflow ids (non-skipped) that reference the source tag — not workflows ' +
				'attached to the contested target tag.',
		}),
	})
	.openapi({
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
	});

const variableUnresolvedIssueSchema = z
	.object({
		type: z.literal('variable-unresolved'),
		name: z.string().openapi({
			description: 'Requirement name with no match in the target project or global scope.',
		}),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi({
		description:
			'A variable reference that could not be resolved in the target project or the global ' +
			'scope, under `variableMissingMode=must-preexist`.',
	});

const variableConflictIssueSchema = z
	.object({
		type: z.literal('variable-conflict'),
		name: z.string().openapi({ description: 'Name of the variable whose value differs.' }),
		projectId: z.string().optional().openapi({
			description:
				'Project owning the resolved variable. Absent when it resolved at the global scope.',
		}),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi({
		description:
			'A variable that resolved in the target project or the global scope, but whose value ' +
			'differs from the one the package bundles for it, under `variableConflictPolicy=fail`. ' +
			'Also reported under `overwrite`, once per scope, when the projects of a package resolve ' +
			'one row and disagree about the value it should hold. Values are never reported — only the ' +
			'name and the scope the variable was found in.',
	});

const variableLimitExceededIssueSchema = z
	.object({
		type: z.literal('variable-limit-exceeded'),
		limit: z.number().int().openapi({ description: 'The instance variable quota.' }),
		// Can be negative after a licence downgrade, so no `.nonnegative()`.
		remaining: z
			.number()
			.int()
			.openapi({
				description:
					'Variable rows still available under the quota. The import is blocked because ' +
					'`requested` exceeds this, not because it exceeds `limit`.',
			}),
		requested: z.number().int().openapi({
			description:
				'Number of new variable rows the import would create (destination-deduplicated).',
		}),
		names: z.array(z.string()).openapi({
			description: 'The unique variable names the import would create.',
		}),
		usedByWorkflows: z.array(z.string()).openapi({
			description: 'Package workflow ids that reference any of the listed variables.',
		}),
	})
	.openapi({
		description:
			"Creating the package's variables under `create-stub` or `create-with-value` would " +
			'exceed the instance variable quota (`quota:maxVariables`). Reported once for the whole ' +
			'import; nothing is created.',
	});

const missingNodeTypeIssueSchema = z
	.object({
		type: z.literal('missing-node-type'),
		nodeType: z
			.string()
			.openapi({ description: "Full node type name as used by the package's workflows." }),
		typeVersion: z
			.number()
			.openapi({ description: "Node type version the package's workflows use." }),
		usedByWorkflows: z.array(z.string()).openapi({
			description: 'Package workflow ids that use this node type and version.',
		}),
	})
	.openapi({
		description:
			'A node type — or a version of a node type — used by a package workflow that this ' +
			'instance does not have, under `missingNodeTypeMode=fail`. One issue is reported per ' +
			'missing `(nodeType, typeVersion)` pair.',
	});

const policyViolationIssueSchema = z
	.object({
		type: z.literal('policy-violation'),
		sourceWorkflowId: z
			.string()
			.openapi({ description: 'Workflow id as it appears in the package.' }),
		name: z.string(),
		violations: z.array(policyViolationSchema),
	})
	.openapi({
		description:
			'A workflow the content-import policy refused. Takes down the whole package rather than ' +
			'skipping the workflow: the import rewrites cross-workflow references to the ids each ' +
			'workflow would get, so dropping one leaves the workflows that call it pointing at a row ' +
			'nothing ever wrote.',
	});

export const importBlockingIssueSchema = z
	.discriminatedUnion('type', [
		workflowConflictIssueSchema,
		workflowLineageConflictIssueSchema,
		workflowIdConflictIssueSchema,
		workflowFolderConflictIssueSchema,
		workflowArchiveForbiddenIssueSchema,
		credentialUnresolvedIssueSchema,
		projectConflictIssueSchema,
		folderConflictIssueSchema,
		workflowRemovalForbiddenIssueSchema,
		workflowRemovalConflictIssueSchema,
		folderRemovalForbiddenIssueSchema,
		dataTableUnresolvedIssueSchema,
		tagUnresolvedIssueSchema,
		variableUnresolvedIssueSchema,
		variableConflictIssueSchema,
		variableLimitExceededIssueSchema,
		missingNodeTypeIssueSchema,
		policyViolationIssueSchema,
	])
	.openapi('ImportBlockingIssue');

export type ImportBlockingIssue = z.infer<typeof importBlockingIssueSchema>;
