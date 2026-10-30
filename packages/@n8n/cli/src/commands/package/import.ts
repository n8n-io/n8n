import type { ImportResultDto } from '@n8n/api-types';
import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { toPackagesError } from './package-error';
import { BaseCommand } from '../../base-command';

export default class PackageImport extends BaseCommand {
	static override description = 'Import Agents and workflows from an n8n package (.n8np)';

	static override examples = [
		'<%= config.bin %> package import --file=export.n8np',
		'<%= config.bin %> package import --file=export.n8np --project-id=<id> --conflict-policy=skip',
		'<%= config.bin %> package import --file=export.n8np --conflict-policy=fail --credential-missing-mode=must-preexist',
		'<%= config.bin %> package import --file=export.n8np --project-id=<id> --credential-conflict-policy=overwrite',
		'<%= config.bin %> package import --file=export.n8np --conflict-policy=fail --bindings=\'{"credentials":{"<sourceId>":"<targetId>"}}\'',
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
		conflictPolicy: Flags.option({
			description:
				'What to do when an Agent or workflow already exists in the target project, or a skill of an imported Agent already exists. new-version saves a new version, skip keeps the existing one, and fail blocks the import. A missing skill is created. Under every policy, a skill ID that another project, Agent or the instance owns, or a skill name that its scope already uses, blocks the import',
			options: ['new-version', 'fail', 'skip'] as const,
			default: 'new-version',
			aliases: ['conflict-policy'],
		})(),
		publishingPolicy: Flags.option({
			description:
				'Publication policy for imported Agents and workflows (instance default: preserve-published-state). Preserve republishes an updated entity only if it was published and the package contains its source-published version. match-source follows source publication when that version is included. publish-all publishes imported entities. unpublish-all keeps new entities unpublished and unpublishes updated entities that were published. Skipped entities stay unchanged.',
			options: [
				'preserve-published-state',
				'match-source',
				'publish-all',
				'unpublish-all',
			] as const,
			aliases: ['publishing-policy'],
		})(),
		idPolicy: Flags.option({
			description:
				'IDs for newly created Agents and workflows. Only source is supported. New entities use the package IDs. Matched entities keep their destination IDs.',
			options: ['source'] as const,
			aliases: ['id-policy'],
		})(),
		missingNodeTypeMode: Flags.option({
			description:
				'What to do when workflow nodes or Agent node tools use a missing node type or version (instance default: fail). import-anyway saves affected definitions but blocks their publication',
			options: ['fail', 'import-anyway'] as const,
			aliases: ['missing-node-type-mode'],
		})(),
		projectConflictPolicy: Flags.option({
			description:
				"What to do when a project in the package already exists on the instance, and by default how its contents are treated too (default on the instance: merge). merge keeps the existing project's details and adds the package's contents alongside; overwrite replaces those details and, via --folder-conflict-policy, removes contents the package does not carry; fail rejects the import. Project packages only",
			options: ['merge', 'fail', 'overwrite'] as const,
			aliases: ['project-conflict-policy'],
		})(),
		folderConflictPolicy: Flags.option({
			description:
				'What to do when a package folder already exists in the target project. Defaults to whatever --project-conflict-policy is, so state the intent once (merge for a workflow package, which defines no projects). merge reuses the folder and merges the package children in; fail rejects the import; overwrite additionally removes workflows the package does not contain, and is rejected unless --project-conflict-policy is also overwrite',
			options: ['merge', 'fail', 'overwrite'] as const,
			aliases: ['folder-conflict-policy'],
		})(),
		overwriteDeletionPolicy: Flags.option({
			description:
				'How --folder-conflict-policy=overwrite removes a workflow the package does not contain (default on the instance: archive). archive keeps it recoverable; hard-delete also drops the workflow and its execution history',
			options: ['archive', 'hard-delete'] as const,
			aliases: ['overwrite-deletion-policy'],
		})(),
		credentialMatchingMode: Flags.option({
			description: 'How credential references are matched on the target instance',
			options: ['id-only', 'name-and-type', 'type-only'] as const,
			aliases: ['credential-matching-mode'],
		})(),
		credentialMissingMode: Flags.option({
			description:
				'What to do when a referenced credential cannot be resolved (default on the instance: create-stub)',
			options: ['must-preexist', 'create-stub', 'create-with-values'] as const,
			aliases: ['credential-missing-mode'],
		})(),
		credentialConflictPolicy: Flags.option({
			description:
				'What to do when a referenced credential matches an existing credential and the package has a different name or different values for it (default on the instance: keep-existing). keep-existing never changes a matched credential; overwrite writes the package name and expression values to a matched credential that a project of the import owns, keeps all other stored values (secrets, other fields, the OAuth connection, array fields), never changes a global credential owned by another project or a managed, end-user (resolvable) or instance-level credential, lists the changed credentials under credentials.updated, and needs credential:update when the import changes a credential; fail rejects the import when overwrite would change a matched credential. No policy writes a match that would not change. overwrite and fail compare stored values, so they need credential:update on each matched credential that a project of the import owns, also when it would not change',
			options: ['keep-existing', 'overwrite', 'fail'] as const,
			aliases: ['credential-conflict-policy'],
		})(),
		dataTableMatchingMode: Flags.option({
			description: 'How referenced data tables are matched on the target instance',
			options: ['by-id'] as const,
			aliases: ['data-table-matching-mode'],
		})(),
		dataTableMissingMode: Flags.option({
			description:
				'What to do when a referenced data table is absent in the target project (default on the instance: create). Under the keep-existing and fail schema conflict policies, matched tables are schema-validated, even with do-nothing. Under overwrite-non-destructive, a matched table blocks the import only when a change removes or retypes a column. Matched tables change only under --data-table-schema-conflict-policy=overwrite or overwrite-non-destructive',
			options: ['create', 'must-preexist', 'do-nothing'] as const,
			aliases: ['data-table-missing-mode'],
		})(),
		dataTableSchemaConflictPolicy: Flags.option({
			description:
				'How strictly a matched target data table schema is compared: keep-existing (instance default) requires every package column but ignores additional columns the target table has of its own; fail rejects any difference. keep-existing and fail never alter the matched target table. overwrite changes the matched target table to match the package. It can remove or retype columns. The values in those columns are removed. Rows and other columns are kept. When the package has column ids, a column that is only renamed keeps its values. The changes apply to all workflows that use the table. overwrite-non-destructive makes the same changes as overwrite, but rejects the import and writes nothing when a change removes or retypes a column. A target-only column counts as removed. Needs dataTable:update when a table changes.',
			options: ['keep-existing', 'fail', 'overwrite', 'overwrite-non-destructive'] as const,
			aliases: ['data-table-schema-conflict-policy'],
		})(),
		variableMissingMode: Flags.option({
			description:
				'What to do when a referenced variable is absent from the target project and global scope (default: create-with-value). create-with-value uses the package value, or an empty stub when the package carries no value for it; create-stub always creates an empty value; do-nothing reports unresolved names; must-preexist rejects the import. Creating modes use variable-parent-policy, and an import that creates a variable needs a variables-enabled license plus variable:create',
			options: ['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'] as const,
			aliases: ['variable-missing-mode'],
		})(),
		variableConflictPolicy: Flags.option({
			description:
				'What to do when a referenced variable already resolves in the target project or global scope but the package bundles a different value for it (default: keep-existing). keep-existing leaves the target value alone; overwrite silently replaces the value of the existing variable at whichever scope it was found — including a global one other projects read — and needs a variables-enabled license plus variable:update (projectVariable:update for a project-scoped variable); fail rejects the import. No policy touches a resolved variable when there is nothing to change: either the package bundles no value for it (excluded at export, or an exported value that was itself empty), or the value it bundles already matches the one on the target. Under overwrite, a project package whose projects hold different values for a name they all resolve to one row is rejected: one row cannot carry both values',
			options: ['keep-existing', 'overwrite', 'fail'] as const,
			aliases: ['variable-conflict-policy'],
		})(),
		variableParentPolicy: Flags.option({
			description:
				'Where creating variable modes place missing variables for workflow/folder packages: project (the behaviour when omitted) uses the target project; global uses global scope. Must be omitted for project packages, which reject it with a 400 — their placement follows the package layout',
			options: ['project', 'global'] as const,
			aliases: ['variable-parent-policy'],
		})(),
		tagMissingMode: Flags.option({
			description:
				'What to do when a tag referenced by the package is absent on the target instance — tags are matched by source id, never by name (default on the instance: create). create creates the tag globally with its source id and name, and needs an API key with the tag:create scope when the import would create a tag; do-nothing imports the workflows without the missing tags and lists them under tags.skipped',
			options: ['create', 'do-nothing'] as const,
			aliases: ['tag-missing-mode'],
		})(),
		tagConflictPolicy: Flags.option({
			description:
				"What to do when a referenced tag conflicts on the target instance — the same-id target tag has a different name (rename drift), or the tag's name is held by a different tag (name collision). skip (instance default) imports the workflows without the conflicted tags and lists them under tags.skipped; fail rejects the import; rename renames a drifted target tag to the package name (needs an API key with the tag:update scope when the import would rename a tag) — name collisions still reject the import",
			options: ['skip', 'fail', 'rename'] as const,
			aliases: ['tag-conflict-policy'],
		})(),
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
			let result: ImportResultDto;
			try {
				result = await client.importPackage(
					{ buffer, filename: path.basename(flags.file) },
					{
						projectId: flags.projectId,
						folderId: flags.folderId,
						conflictPolicy: flags.conflictPolicy,
						publishingPolicy: flags.publishingPolicy,
						idPolicy: flags.idPolicy,
						missingNodeTypeMode: flags.missingNodeTypeMode,
						projectConflictPolicy: flags.projectConflictPolicy,
						folderConflictPolicy: flags.folderConflictPolicy,
						overwriteDeletionPolicy: flags.overwriteDeletionPolicy,
						credentialMatchingMode: flags.credentialMatchingMode,
						credentialMissingMode: flags.credentialMissingMode,
						credentialConflictPolicy: flags.credentialConflictPolicy,
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
