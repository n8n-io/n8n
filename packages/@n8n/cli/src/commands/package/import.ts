import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { toPackagesError } from './shared';
import { BaseCommand } from '../../base-command';

export default class PackageImport extends BaseCommand {
	static override description = 'Import an n8n package (.n8np) into a project';

	static override examples = [
		'<%= config.bin %> package import --file=export.n8np --conflict-policy=fail',
		'<%= config.bin %> package import --file=export.n8np --project=<id> --conflict-policy=new-version',
		'<%= config.bin %> package import --file=export.n8np --conflict-policy=fail --credential-missing-mode=must-preexist',
		'<%= config.bin %> package import --file=export.n8np --conflict-policy=fail --bindings=\'{"credentials":{"<sourceId>":"<targetId>"}}\'',
	];

	static override flags = {
		...BaseCommand.baseFlags,
		file: Flags.string({ description: 'Path to the .n8np package file', required: true }),
		project: Flags.string({
			description: 'Target project ID (defaults to your personal project)',
		}),
		folder: Flags.string({
			description: 'Target folder ID within the project (defaults to the project root)',
		}),
		conflictPolicy: Flags.string({
			description: 'What to do when a workflow already exists in the target project',
			options: ['new-version', 'fail', 'skip'],
			required: true,
			aliases: ['conflict-policy'],
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
				'What to do when a referenced variable is absent from the target project and the global scope (default on the instance: do-nothing). do-nothing imports the workflows and lists unresolved names as warnings without creating anything; must-preexist rejects the import unless every referenced variable already resolves',
			options: ['do-nothing', 'must-preexist'],
			aliases: ['variable-missing-mode'],
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
						projectId: flags.project,
						folderId: flags.folder,
						workflowConflictPolicy: flags.conflictPolicy,
						workflowPublishingPolicy: flags.workflowPublishingPolicy,
						workflowIdPolicy: flags.workflowIdPolicy,
						missingNodeTypeMode: flags.missingNodeTypeMode,
						folderConflictPolicy: flags.folderConflictPolicy,
						credentialMatchingMode: flags.credentialMatchingMode,
						credentialMissingMode: flags.credentialMissingMode,
						dataTableMatchingMode: flags.dataTableMatchingMode,
						dataTableMissingMode: flags.dataTableMissingMode,
						dataTableSchemaConflictPolicy: flags.dataTableSchemaConflictPolicy,
						variableMissingMode: flags.variableMissingMode,
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
