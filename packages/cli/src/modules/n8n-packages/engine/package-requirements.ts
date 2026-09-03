import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';

import type { PackageEntries } from './package-entries';
import { CredentialRequirementsExtractor } from '../entities/credential/credential-requirements.extractor';
import { DataTableRequirementsExtractor } from '../entities/data-table/data-table-requirements.extractor';
import { VariableRequirementsExtractor } from '../entities/variable/variable-requirements.extractor';
import { collectNodeTypeUsage } from '../entities/workflow/node-type-usage';
import type { WorkflowNodeTypeSource } from '../entities/workflow/node-type-usage';
import { extractWorkflowRequirements } from '../entities/workflow/references/extract-workflow-requirements';
import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import type { PackageReader } from '../io/package-reader';
import { ENTITY_FILES } from '../spec/constants';
import type { ManifestEntry } from '../spec/manifest.schema';
import type { PackageRequirements } from '../spec/requirements.schema';
import { serializedWorkflowSchema } from '../spec/serialized/workflow.schema';

/** Read at most this many workflow files at once. */
const READ_BATCH_SIZE = 32;

type PackageRequirementItem<K extends keyof PackageRequirements> = NonNullable<
	PackageRequirements[K]
>[number];

interface ParsedWorkflow {
	id: string;
	entity: WorkflowEntity;
	tagIds: string[];
}

/** Fold one more user into the requirement for `key`, creating it on first use. */
function addUse<T extends { usedByWorkflows: string[] }>(
	byKey: Map<string, T>,
	key: string,
	workflowId: string,
	create: () => T,
): void {
	const requirement = byKey.get(key) ?? create();
	if (!requirement.usedByWorkflows.includes(workflowId)) {
		requirement.usedByWorkflows.push(workflowId);
	}
	byKey.set(key, requirement);
}

const listOf = <T>(byKey: Map<string, T>) => (byKey.size > 0 ? [...byKey.values()] : undefined);

/**
 * Derives what the workflows of a package need from the workflow files, with
 * the same extractors the exporter runs against the database.
 *
 * The manifest states the requirements too, but it is a separate statement
 * that can disagree with the files, and it is on its way out of the
 * repository. A caller that reconciles a package with something else needs to
 * know which workflow uses which dependency, or it reads every dependency of a
 * workflow it did not look at as an orphan.
 *
 * Two names cannot come from the workflow files: a data table and a tag are
 * referenced by id. The entries supply them when the package bundles them, and
 * the id stands in when it does not.
 */
@Service()
export class PackageRequirementsReader {
	constructor(
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly credentialRequirements: CredentialRequirementsExtractor,
		private readonly dataTableRequirements: DataTableRequirementsExtractor,
		private readonly variableRequirements: VariableRequirementsExtractor,
	) {}

	async read(
		reader: PackageReader,
		entries: PackageEntries,
	): Promise<PackageRequirements | undefined> {
		const workflows = await this.readWorkflows(reader, entries.workflows);
		if (workflows.length === 0) return undefined;

		const nameById = (list: ManifestEntry[]) => new Map(list.map((e) => [e.id, e.name]));
		const workflowNames = nameById(entries.workflows);
		const dataTableNames = nameById(entries.dataTables);
		const tagNames = nameById(entries.tags);

		const credentials = new Map<string, PackageRequirementItem<'credentials'>>();
		const dataTables = new Map<string, PackageRequirementItem<'dataTables'>>();
		const subWorkflows = new Map<string, PackageRequirementItem<'workflows'>>();
		const variables = new Map<string, PackageRequirementItem<'variables'>>();
		const tags = new Map<string, PackageRequirementItem<'tags'>>();
		const nodeTypeSources: WorkflowNodeTypeSource[] = [];

		for (const { id, entity, tagIds } of workflows) {
			for (const use of this.credentialRequirements.extract(entity)) {
				addUse(credentials, use.credentialId, id, () => ({
					id: use.credentialId,
					name: use.credentialName,
					type: use.credentialType,
					usedByWorkflows: [],
				}));
			}
			for (const use of this.dataTableRequirements.extract(entity)) {
				addUse(dataTables, use.dataTableId, id, () => ({
					id: use.dataTableId,
					name: dataTableNames.get(use.dataTableId) ?? use.dataTableId,
					usedByWorkflows: [],
				}));
			}
			for (const use of this.variableRequirements.extract(entity)) {
				addUse(variables, use.variableName, id, () => ({
					name: use.variableName,
					usedByWorkflows: [],
				}));
			}
			for (const use of extractWorkflowRequirements(entity)) {
				const name = workflowNames.get(use.referencedWorkflowId);
				addUse(subWorkflows, use.referencedWorkflowId, id, () => ({
					id: use.referencedWorkflowId,
					...(name ? { name } : {}),
					usedByWorkflows: [],
				}));
			}
			for (const tagId of tagIds) {
				addUse(tags, tagId, id, () => ({
					id: tagId,
					name: tagNames.get(tagId) ?? tagId,
					usedByWorkflows: [],
				}));
			}
			nodeTypeSources.push({ workflowId: id, nodes: entity.nodes });
		}

		const nodeTypes = collectNodeTypeUsage(nodeTypeSources);

		const requirements: PackageRequirements = {
			credentials: listOf(credentials),
			dataTables: listOf(dataTables),
			workflows: listOf(subWorkflows),
			variables: listOf(variables),
			tags: listOf(tags),
			nodeTypes: nodeTypes.length > 0 ? nodeTypes : undefined,
		};

		// Workflows that need nothing state nothing.
		return Object.values(requirements).some((list) => list !== undefined)
			? requirements
			: undefined;
	}

	private async readWorkflows(
		reader: PackageReader,
		entries: ManifestEntry[],
	): Promise<ParsedWorkflow[]> {
		// Indexed, not appended: a batch finishes in whatever order the reads
		// complete, and the order decides how `usedByWorkflows` is listed.
		const workflows = new Array<ParsedWorkflow>(entries.length);

		const read = async (entry: ManifestEntry, index: number) => {
			const file = `${entry.target}/${ENTITY_FILES.workflows}`;
			const raw = jsonParse<unknown>((await reader.readFile(file)).toString('utf-8'), {
				fallbackValue: null,
			});

			try {
				const wire = serializedWorkflowSchema.parse(raw);
				workflows[index] = {
					id: entry.id,
					// The entry id identifies the workflow: `deserialize` drops the id,
					// because an import gives the workflow a fresh one.
					entity: Object.assign(new WorkflowEntity(), this.workflowSerializer.deserialize(wire), {
						id: entry.id,
					}),
					tagIds: wire.tagIds ?? [],
				};
			} catch (cause) {
				throw new UserError(
					`Package holds a workflow file that failed validation at "${entry.target}".`,
					{ cause },
				);
			}
		};

		for (let i = 0; i < entries.length; i += READ_BATCH_SIZE) {
			await Promise.all(
				entries
					.slice(i, i + READ_BATCH_SIZE)
					.map(async (entry, offset) => await read(entry, i + offset)),
			);
		}

		return workflows;
	}
}
