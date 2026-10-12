import '../../openapi-extend';

import { z } from 'zod';

import { importBlockingIssueSchema } from './import-blocking-issue.schema';
import { Z } from '../../zod-class';

const importPackageSummarySchema = z.object({
	sourceN8nVersion: z.string(),
	sourceId: z.string(),
	exportedAt: z.string().datetime(),
});

const publishingOutcomeSchema = z.object({
	state: z.enum(['published', 'unpublished', 'unchanged', 'blocked', 'failed']).openapi({
		description:
			'`blocked` means the imported version could not be published and no version is active ' +
			'(for example because the Agent or workflow uses an empty or incomplete credential, or a node type this ' +
			'instance does not have). When a prior published version remains active, `state` is ' +
			'`unchanged` with `skippedPublishReason` instead. `failed` means publish or unpublish was ' +
			'attempted but did not succeed.',
	}),
	error: z.string().optional().openapi({
		description:
			'Present when `state` is `failed`. Explains why publish or unpublish could not be applied.',
	}),
	blockedReason: z
		.enum(['stub-credential', 'incomplete-credential', 'missing-node-type'])
		.optional()
		.openapi({
			description:
				'Present when `state` is `blocked`: the imported version could not be published and no ' +
				'version is active.',
		}),
	skippedPublishReason: z
		.enum(['stub-credential', 'incomplete-credential', 'missing-node-type'])
		.optional()
		.openapi({
			description:
				'Present when `state` is `unchanged` but the policy wanted to publish the imported ' +
				'version: a prior published version is still active (for example after an update with ' +
				'empty or incomplete credentials).',
		}),
});

const importedWorkflowSummarySchema = z.object({
	sourceWorkflowId: z
		.string()
		.openapi({ description: 'Workflow id as it appeared in the package.' }),
	localId: z.string().openapi({
		description:
			'Workflow ID on the target instance. New workflows use the package ID. ' +
			'Updated and skipped workflows keep their destination ID.',
	}),
	name: z.string(),
	projectId: z.string(),
	parentFolderId: z.string().nullable(),
	activeVersionId: z
		.string()
		.nullable()
		.openapi({
			description:
				'Published version on the target instance, if any. `null` when the workflow is not ' +
				'published after import.',
		}),
	isArchived: z.boolean().openapi({
		description:
			'Whether the workflow is archived on the target after import. Under `new-version` this ' +
			"follows the package's `isArchived` flag. A skipped workflow keeps its own state.",
	}),
	publishing: publishingOutcomeSchema.openapi({
		description: 'Outcome of applying the selected publishing policy to this workflow.',
	}),
	status: z.enum(['created', 'updated', 'skipped']).openapi({
		description: 'Import outcome for this package workflow.',
	}),
});

const importedAgentSummarySchema = z.object({
	sourceAgentId: z.string().openapi({ description: 'Agent ID in the package.' }),
	localId: z.string().openapi({
		description:
			'Agent ID on the target instance. New Agents use the package ID. ' +
			'Updated and skipped Agents keep their destination ID.',
	}),
	name: z.string(),
	projectId: z.string(),
	activeVersionId: z.string().nullable().openapi({
		description: 'Published version on the target after import. Null when no version is published.',
	}),
	status: z.enum(['created', 'updated', 'skipped']),
	publishing: publishingOutcomeSchema.openapi({
		description: 'Publication outcome. A failed publication does not undo the definition import.',
	}),
});

const removedWorkflowSummarySchema = z.object({
	workflowId: z.string().openapi({ description: 'Id of the removed workflow on this instance.' }),
	name: z.string(),
	projectId: z.string().openapi({ description: 'Project the workflow was reconciled against.' }),
	parentFolderId: z.string().nullable().openapi({
		description: 'Folder that held the workflow, or null at the project root.',
	}),
	deletion: z.enum(['archived', 'deleted']).openapi({
		description:
			'What actually happened, not what `overwriteDeletionPolicy` asked for: a `hard-delete` ' +
			'whose row could not be dropped yet is reported as `archived`.',
	}),
});

const removedFolderSummarySchema = z.object({
	folderId: z.string(),
	name: z.string(),
	projectId: z.string(),
	parentFolderId: z.string().nullable().openapi({
		description: 'Folder that held it, or null at the project root.',
	}),
});

const importedFolderSummarySchema = z.object({
	sourceFolderId: z.string().openapi({ description: 'Folder id as it appeared in the package.' }),
	localId: z.string().openapi({
		description:
			'Folder id on the target instance (equal to `sourceFolderId`; folder ids are reused).',
	}),
	name: z.string(),
	parentFolderId: z.string().nullable().openapi({
		description: 'Resolved parent folder on the target, or `null` at the project root.',
	}),
	status: z.enum(['created', 'skipped']).openapi({
		description: 'Import outcome for this package folder.',
	}),
});

const importedProjectSummarySchema = z.object({
	sourceProjectId: z.string().openapi({ description: 'Project id as it appeared in the package.' }),
	localId: z.string().openapi({
		description:
			'Project id on the target instance (equal to `sourceProjectId`; project ids are reused).',
	}),
	name: z.string().openapi({
		description:
			"The project's name on the target: the package's under `overwrite`, the pre-existing " +
			'one under `merge`.',
	}),
	status: z.enum(['created', 'updated', 'skipped']).openapi({
		description:
			'Import outcome for this package project. `skipped` means the project already existed ' +
			'and `projectConflictPolicy=merge` left its details untouched — its contents were still ' +
			'imported.',
	}),
});

const importCredentialSummarySchema = z
	.object({
		matched: z.array(z.string()).openapi({
			description:
				'Source credential ids from the package that matched existing credentials on the target instance.',
		}),
		stubbed: z.array(z.string()).openapi({
			description:
				'Source credential ids for which empty placeholder credentials were created in the target project.',
		}),
		seeded: z.array(z.string()).openapi({
			description:
				'Source credential ids for which credentials were created in the target project with ' +
				'all their source data from the bundled expression values.',
		}),
		incomplete: z.array(z.string()).openapi({
			description:
				'Source credential ids for which credentials were created in the target project with ' +
				'bundled expression values, but the package does not confirm that it carries all source ' +
				'data. These credentials need input. The import does not publish the imported version ' +
				'of workflows that use them (`incomplete-credential`).',
		}),
		updated: z.array(z.string()).openapi({
			description:
				'Source credential ids whose matched credential this import changed under ' +
				'`credentialConflictPolicy=overwrite`. These ids are not listed under `matched`. ' +
				'Empty for other policies.',
		}),
	})
	.openapi({
		description:
			'Source credential ids grouped by whether they matched an existing credential, were ' +
			'created as empty stubs, seeded credentials, or incomplete credentials, or matched a ' +
			'credential that this import updated. Full source→target id mapping is in `bindings.credentials`.',
	});

const importDataTableSummarySchema = z.object({
	matched: z.number().int().nonnegative(),
	created: z.number().int().nonnegative(),
	updated: z.number().int().nonnegative(),
});

const importVariableSummarySchema = z
	.object({
		matched: z.array(z.string()).openapi({
			description:
				"Variable names that resolved to an existing variable (importing project's scope first, " +
				'then global) and were left untouched. A resolved variable this import rewrote is listed ' +
				'under `updated` instead.',
		}),
		missing: z.array(z.string()).openapi({
			description:
				'Variable names still unresolved after import. Under `variableMissingMode=do-nothing` ' +
				'these are warnings — the import still succeeds and nothing is created. A successful ' +
				'`create-stub` or `create-with-value` import normally leaves this empty.',
		}),
		created: z.array(z.string()).openapi({
			description:
				'Variable names created with a package value under `variableMissingMode=create-with-value`. ' +
				'Empty stubs are listed under `stubbed`.',
		}),
		stubbed: z.array(z.string()).openapi({
			description:
				'Variable names created with an empty value by this import under ' +
				'`variableMissingMode=create-stub`, or because `create-with-value` had no exported value. ' +
				'Empty for other outcomes.',
		}),
		updated: z.array(z.string()).openapi({
			description:
				'Variable names whose existing value this import replaced with the package value under ' +
				'`variableConflictPolicy=overwrite`. Empty for other policies.',
		}),
	})
	.openapi({
		description:
			"Resolution of the package's variable requirements. Names only — values never travel in " +
			'the response. For project packages these arrays are package-level unions of ' +
			'per-destination outcomes and may overlap (for example, a name may be created with a value ' +
			'in one project and stubbed in another); classification under concurrent external writes is ' +
			'best-effort.',
	});

const importTagSummarySchema = z
	.object({
		matched: z.array(z.string()).openapi({
			description:
				'Tags that resolved to an existing tag with the same id and name; attached as-is.',
		}),
		created: z.array(z.string()).openapi({
			description: 'Tags created by this import, by name, under `tagMissingMode=create`.',
		}),
		renamed: z.array(z.string()).openapi({
			description:
				'Target tags renamed to the package name under `tagConflictPolicy=rename`; listed by their new name.',
		}),
		reconciled: z.array(z.string()).openapi({
			description:
				'Existing target tags re-keyed to the package (source) id on a name collision under ' +
				'`tagConflictPolicy=rename`; their name, workflow and folder taggings are kept.',
		}),
		skipped: z.array(z.string()).openapi({
			description:
				'Tags dropped from the import — not created, not renamed, and not attached to any ' +
				'imported workflow — under `tagMissingMode=do-nothing` or `tagConflictPolicy=skip`.',
		}),
	})
	.openapi({
		description:
			'Resolution of the tags referenced by the imported workflows, matched by source id. Tag ' +
			'names only.',
	});

const serializedBindingsSchema = z
	.object({
		agents: z.record(z.string(), z.string()).openapi({
			description: 'Source-to-target IDs for created, updated, and skipped package Agents.',
		}),
		workflows: z.record(z.string(), z.string()),
		credentials: z.record(z.string(), z.string()).openapi({
			description:
				'Credential id from `requirements.credentials` in the package manifest → resolved ' +
				'target credential id on the target instance. Covers both a matched existing ' +
				'credential and a credential that the import created under ' +
				'`credentialMissingMode=create-stub` or `create-with-values`.',
		}),
	})
	.openapi({
		description:
			'Source id → target id mappings produced during import, one map per entity type. Each ' +
			'value maps an id as it appeared in the package to the id on the target instance.',
	});

export const importResultSchema = z.object({
	package: importPackageSummarySchema,
	agents: z.array(importedAgentSummarySchema),
	counts: z.object({
		agents: z.object({
			created: z.number().int().nonnegative(),
			updated: z.number().int().nonnegative(),
			skipped: z.number().int().nonnegative(),
		}),
	}),
	workflows: z.array(importedWorkflowSummarySchema),
	removedWorkflows: z.array(removedWorkflowSummarySchema).openapi({
		description: 'Workflows removed from the target during this import.',
	}),
	removedFolders: z.array(removedFolderSummarySchema).openapi({
		description:
			'Folders the package does not define that reconciliation left empty, removed by ' +
			'`folderConflictPolicy=overwrite`. A folder still holding anything survives, so ' +
			'target-only content is never swept up. Empty under every other policy.',
	}),
	folders: z.array(importedFolderSummarySchema).openapi({
		description: 'Folder shells created or skipped in the target project.',
	}),
	projects: z.array(importedProjectSummarySchema).openapi({
		description:
			'Project shells created, or matched and then updated or left as-is (see ' +
			'`projectConflictPolicy`). Present for project packages; empty when importing loose ' +
			'workflows/folders.',
	}),
	bindings: serializedBindingsSchema,
	credentials: importCredentialSummarySchema,
	dataTables: importDataTableSummarySchema,
	variables: importVariableSummarySchema,
	tags: importTagSummarySchema,
});

export class ImportResultDto extends Z.class(importResultSchema.shape) {}

/** Body of the 409/422 responses a blocked import returns. */
export class ImportBlockedErrorDto extends Z.class({
	message: z.string(),
	issues: z.array(importBlockingIssueSchema),
}) {}
