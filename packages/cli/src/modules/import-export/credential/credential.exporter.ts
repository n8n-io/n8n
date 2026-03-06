import { Service } from '@n8n/di';
import { CredentialsRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { EntityExporter } from '../entity-exporter';
import { writeEntityFiles } from '../entity-exporter';
import type { EntityKey, ExportScope, ManifestEntry } from '../import-export.types';

@Service()
export class CredentialExporter implements EntityExporter {
	readonly entityKey: EntityKey = 'credentials';

	constructor(private readonly credentialsRepository: CredentialsRepository) {}

	async export(scope: ExportScope): Promise<ManifestEntry[]> {
		if (!scope.projectId) return [];

		const credentials = await this.credentialsRepository.find({
			select: { id: true, name: true, type: true },
			where: { shared: { projectId: scope.projectId } },
		});

		if (credentials.length === 0) return [];

		return this.writeCredentials(credentials, scope);
	}

	/**
	 * Export specific credentials by ID. Used by the pipeline to include
	 * referenced credentials in workflow/folder packages.
	 */
	async exportByIds(ids: string[], scope: ExportScope): Promise<ManifestEntry[]> {
		if (ids.length === 0) return [];

		const credentials = await this.credentialsRepository.find({
			select: { id: true, name: true, type: true },
			where: { id: In(ids) },
		});

		if (credentials.length === 0) return [];

		return this.writeCredentials(credentials, scope);
	}

	private writeCredentials(
		credentials: Array<{ id: string; name: string; type: string }>,
		scope: ExportScope,
	): ManifestEntry[] {
		return writeEntityFiles(credentials, scope, {
			resourceDir: 'credentials',
			filename: 'credential.json',
			getId: (c) => c.id,
			getName: (c) => c.name,
			serialize: (c) => ({ id: c.id, name: c.name, type: c.type }),
		});
	}
}
