import type { PromotionResource } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { DataTableService } from '@n8n/backend-module-data-table';
import { CredentialsRepository, SharedCredentialsRepository, VariablesRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { DataTableSerializer } from '@/modules/n8n-packages/entities/data-table/data-table.serializer';
import { TagImporter } from '@/modules/n8n-packages/entities/tag/tag-importer';
import { serializeTag } from '@/modules/n8n-packages/entities/tag/tag.exporter';
import { formatEntityFile } from '@/modules/n8n-packages/io/entity-file-format';
import { gitBlobSha } from '@/modules/n8n-packages/io/hashing-package-writer';

import { resourceKey, variableResourceKey } from './promotion-preview';

export type LocalDataTable = { content: string; blobSha: string };

export type LocalTag = LocalDataTable & { id: string; name: string };

/**
 * Tags, data tables and credentials on this instance that Apply reuses. The local export holds only those that
 * local workflows use, so the others are read here. Each is serialized as the package stores it,
 * so it compares with the branch file.
 */
@Service()
export class LocalPackageEntities {
	constructor(
		private readonly tagImporter: TagImporter,
		private readonly dataTableService: DataTableService,
		private readonly dataTableSerializer: DataTableSerializer,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly variablesRepository: VariablesRepository,
	) {}

	/**
	 * The credentials, data tables and variables that the projects own. A project deletion
	 * deletes them too, also those that no workflow uses.
	 */
	async ownedByProjects(projectIds: string[]): Promise<PromotionResource[]> {
		if (projectIds.length === 0) return [];
		const [credentials, tables, variables] = await Promise.all([
			this.sharedCredentialsRepository.findOwnedCredentialsByProjects(projectIds),
			this.moduleRegistry.isActive('data-table')
				? this.dataTableService
						.getManyAndCount({ filter: { projectId: projectIds } })
						.then(({ data }) => data)
				: [],
			this.variablesRepository.findByProjectIds(projectIds),
		]);
		const deleted = (
			type: PromotionResource['type'],
			key: string,
			{ id, name }: { id: string; name: string },
		): PromotionResource => ({
			key,
			type,
			id,
			name,
			parentKey: null,
			change: 'deleted',
			selectable: false,
			revision: { before: null, after: null },
		});
		return [
			...credentials.map((credential) =>
				deleted('credential', resourceKey('credential', credential.id), credential),
			),
			...tables.map((table) => deleted('dataTable', resourceKey('dataTable', table.id), table)),
			...variables.map(({ id, key, projectId }) =>
				deleted('variable', variableResourceKey(key, projectId), { id, name: key }),
			),
		];
	}

	/** The local name of each credential. A credential that Apply only binds keeps this name. */
	async credentialNames(ids: string[]): Promise<Map<string, string>> {
		if (ids.length === 0) return new Map();
		const credentials = await this.credentialsRepository.findNamesByIds(ids);
		return new Map(credentials.map(({ id, name }) => [id, name]));
	}

	/** The local tag that Apply uses for each branch tag: the tag with the same ID, else the tag with the same name. */
	async tags(
		branchTags: ReadonlyArray<{ id: string; name: string }>,
	): Promise<Map<string, LocalTag>> {
		if (branchTags.length === 0) return new Map();
		const local = await this.tagImporter.findLocalTags(branchTags);
		return new Map(
			branchTags.flatMap(({ id, name }): Array<[string, LocalTag]> => {
				const tag = local.byId.get(id) ?? local.byName.get(name.trim());
				if (!tag) return [];
				const content = formatEntityFile(serializeTag(tag));
				return [[id, { id: tag.id, name: tag.name, content, blobSha: gitBlobSha(content) }]];
			}),
		);
	}

	async dataTables(ids: string[]): Promise<Map<string, LocalDataTable>> {
		if (ids.length === 0 || !this.moduleRegistry.isActive('data-table')) return new Map();
		const tables = await this.dataTableService.findDataTablesByIds(ids);
		return new Map(
			tables.map((table) => {
				const content = formatEntityFile(this.dataTableSerializer.serialize(table));
				return [table.id, { content, blobSha: gitBlobSha(content) }];
			}),
		);
	}
}
