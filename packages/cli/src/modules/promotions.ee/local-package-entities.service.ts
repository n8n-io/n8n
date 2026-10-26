import { ModuleRegistry } from '@n8n/backend-common';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableSerializer } from '@/modules/n8n-packages/entities/data-table/data-table.serializer';
import { TagImporter } from '@/modules/n8n-packages/entities/tag/tag-importer';
import { serializeTag } from '@/modules/n8n-packages/entities/tag/tag.exporter';
import { formatEntityFile } from '@/modules/n8n-packages/io/entity-file-format';
import { gitBlobSha } from '@/modules/n8n-packages/io/hashing-package-writer';

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
	) {}

	/** The local name of each credential. Apply binds a credential and keeps its name. */
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
