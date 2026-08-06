import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { toPackagesError } from './package-error';
import { BaseCommand } from '../../base-command';

export default class PackageImport extends BaseCommand {
	static override description = 'Import an n8n package (.n8np) into a project';

	static override examples = [
		'<%= config.bin %> package import --file=export.n8np',
		'<%= config.bin %> package import --file=export.n8np --project-id=<id> --workflow-conflict-policy=skip',
		'<%= config.bin %> package import --file=export.n8np --workflow-conflict-policy=fail --credential-missing-mode=must-preexist',
		'<%= config.bin %> package import --file=export.n8np --workflow-conflict-policy=fail --bindings=\'{"credentials":{"<sourceId>":"<targetId>"}}\'',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to the .n8np package file', required: true }),
		projectId: Flags.string({
			char: 'p',
			description: 'Target project ID (defaults to your personal project)',
			aliases: ['project-id', 'project'],
		}),
		folderId: Flags.string({
			description: 'Target folder ID within the project (defaults to the project root)',
			aliases: ['folder-id', 'folder'],
		}),
		workflowConflictPolicy: Flags.string({
			description: 'What to do when a workflow already exists in the target project',
			options: ['new-version', 'fail', 'skip'],
			default: 'new-version',
			aliases: ['workflow-conflict-policy'],
		}),
		workflowPublishingPolicy: Flags.string({
			description:
				"Whether imported workflows end up published: preserve-published-state (instance default) never publishes drafts — an updated workflow is republished only when it was already published and the package workflow is published too; match-source follows the package workflow's published flag; publish-all publishes every imported workflow; unpublish-all leaves new workflows unpublished and unpublishes updated ones",
			options: ['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'],
			aliases: ['workflow-publishing-policy'],
		}),
		workflowIdPolicy: Flags.string({
			description: 'Whether imported workflows keep their source ID or receive a new one',
			options: ['new', 'source'],
			aliases: ['workflow-id-policy'],
		}),
		missingNodeTypeMode: Flags.string({
			description:
				'What to do when a workflow uses a node type or version this instance does not have (default on the instance: fail). With import-anyway, affected workflows are imported but never published',
			options: ['fail', 'import-anyway'],
			aliases: ['missing-node-type-mode'],
		}),
		projectConflictPolicy: Flags.string({
			description:
				"What to do when a project in the package already exists on the instance (default on the instance: merge). merge keeps the existing project's details and adds the package's contents alongside; overwrite replaces those details with the package's; fail rejects the import. Project packages only",
			options: ['merge', 'fail', 'overwrite'],
			aliases: ['project-conflict-policy'],
		}),
		folderConflictPolicy: Flags.string({
			description: 'What to do when a package folder already exists in the target project',
			options: ['merge', 'fail'],
			aliases: ['folder-conflict-policy'],
		}),
		credentialMatchingMode: Flags.string({
			description: 'How credential references are matched on the target instance',
			options: ['id-only', 'name-and-type', 'type-only'],
			aliases: ['credential-matching-mode'],
		}),
		credentialMissingMode: Flags.string({
			description:
				'What to do when a referenced credential cannot be resolved (default on the instance: create-stub)',
			options: ['must-preexist', 'create-stub'],
			aliases: ['credential-missing-mode'],
		}),
		dataTableMatchingMode: Flags.string({
			description: 'How referenced data tables are matched on the target instance',
			options: ['by-id'],
			aliases: ['data-table-matching-mode'],
		}),
		dataTableMissingMode: Flags.string({
			description:
				'What to do when a referenced data table is absent in the target project (default on the instance: create). Matched tables are always schema-validated, even with do-nothing',
			options: ['create', 'must-preexist', 'do-nothing'],
			aliases: ['data-table-missing-mode'],
		}),
		dataTableSchemaConflictPolicy: Flags.string({
			description:
				'How strictly a matched target data table schema is compared: keep-existing (instance default) requires every package column but ignores additional columns the target table has of its own; fail rejects any difference. Neither policy alters the matched target table',
			options: ['keep-existing', 'fail'],
			aliases: ['data-table-schema-conflict-policy'],
		}),
		variableMissingMode: Flags.string({
			description:
				'What to do when a referenced variable is absent from the target project and global scope (default: create-with-value). create-with-value uses the package value, or an empty stub when the package carries no value for it; create-stub always creates an empty value; do-nothing reports unresolved names; must-preexist rejects the import. Creating modes use variable-parent-policy, and an import that creates a variable needs a variables-enabled license plus variable:create',
			options: ['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'],
			aliases: ['variable-missing-mode'],
		}),
		variableConflictPolicy: Flags.string({
			description:
				'What to do when a referenced variable already resolves in the target project or global scope but the package bundles a different value for it (default: keep-existing). keep-existing leaves the target value alone; overwrite silently replaces the value of the existing variable at whichever scope it was found — including a global one other projects read — and needs a variables-enabled license plus variable:update (projectVariable:update for a project-scoped variable); fail rejects the import. No policy touches a resolved variable when there is nothing to change: either the package bundles no value for it (excluded at export, or an exported value that was itself empty), or the value it bundles already matches the one on the target. Under overwrite, a project package whose projects hold different values for a name they all resolve to one row is rejected: one row cannot carry both values',
			options: ['keep-existing', 'overwrite', 'fail'],
			aliases: ['variable-conflict-policy'],
		}),
		variableParentPolicy: Flags.string({
			description:
				'Where creating variable modes place missing variables for workflow/folder packages: project (the behaviour when omitted) uses the target project; global uses global scope. Must be omitted for project packages, which reject it with a 400 — their placement follows the package layout',
			options: ['project', 'global'],
			aliases: ['variable-parent-policy'],
		}),
		tagMissingMode: Flags.string({
			description:
				'What to do when a tag referenced by the package is absent on the target instance — tags are matched by source id, never by name (default on the instance: create). create creates the tag globally with its source id and name, and needs an API key with the tag:create scope when the import would create a tag; do-nothing imports the workflows without the missing tags and lists them under tags.skipped',
			options: ['create', 'do-nothing'],
			aliases: ['tag-missing-mode'],
		}),
		tagConflictPolicy: Flags.string({
			description:
				"What to do when a referenced tag conflicts on the target instance — the same-id target tag has a different name (rename drift), or the tag's name is held by a different tag (name collision). skip (instance default) imports the workflows without the conflicted tags and lists them under tags.skipped; fail rejects the import; rename renames a drifted target tag to the package name (needs an API key with the tag:update scope when the import would rename a tag) — name collisions still reject the import",
			options: ['skip', 'fail', 'rename'],
			aliases: ['tag-conflict-policy'],
		}),
		bindings: Flags.string({
			description:
				'Explicit source→target id bindings as a JSON object keyed by entity type, e.g. \'{"credentials":{"<sourceId>":"<targetId>"}}\'. Applied before credential-matching-mode resolution.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(PackageImport);

		if (!fs.existsSync(flags.file)) {
			this.error(`File not found: ${flags.file}`);
		}

		await this.execute(async () => {
			const buffer = fs.readFileSync(flags.file);
			const client = this.getClient(flags);
			let result: Record<string, unknown>;
			try {
				result = await client.importPackage(
					{ buffer, filename: path.basename(flags.file) },
					{
						projectId: flags.projectId,
						folderId: flags.folderId,
						workflowConflictPolicy: flags.workflowConflictPolicy,
						workflowPublishingPolicy: flags.workflowPublishingPolicy,
						workflowIdPolicy: flags.workflowIdPolicy,
						missingNodeTypeMode: flags.missingNodeTypeMode,
						projectConflictPolicy: flags.projectConflictPolicy,
						folderConflictPolicy: flags.folderConflictPolicy,
						credentialMatchingMode: flags.credentialMatchingMode,
						credentialMissingMode: flags.credentialMissingMode,
						dataTableMatchingMode: flags.dataTableMatchingMode,
						dataTableMissingMode: flags.dataTableMissingMode,
						dataTableSchemaConflictPolicy: flags.dataTableSchemaConflictPolicy,
						variableMissingMode: flags.variableMissingMode,
						variableConflictPolicy: flags.variableConflictPolicy,
						variableParentPolicy: flags.variableParentPolicy,
						tagMissingMode: flags.tagMissingMode,
						tagConflictPolicy: flags.tagConflictPolicy,
						bindings: flags.bindings,
					},
				);
			} catch (error) {
				throw toPackagesError(error);
			}
			this.output(result, flags);
		});
	}
}
