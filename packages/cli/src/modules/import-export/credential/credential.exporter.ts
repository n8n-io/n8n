import { Service } from '@n8n/di';
import { CredentialsRepository } from '@n8n/db';

import type { ProjectExportContext } from '../import-export.types';
import { generateSlug } from '../slug.utils';

import { CredentialSerializer } from './credential.serializer';
import type { ManifestCredentialEntry } from './credential.types';

@Service()
export class CredentialExporter {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialSerializer: CredentialSerializer,
	) {}

	async exportForProject(ctx: ProjectExportContext): Promise<ManifestCredentialEntry[]> {
		const credentials = await this.credentialsRepository.find({
			where: { shared: { projectId: ctx.projectId } },
		});

		if (credentials.length === 0) return [];

		const entries: ManifestCredentialEntry[] = [];

		for (const credential of credentials) {
			const slug = generateSlug(credential.name, credential.id);
			const target = `${ctx.projectTarget}/credentials/${slug}`;

			const serialized = this.credentialSerializer.serialize(credential);

			ctx.writer.writeDirectory(target);
			ctx.writer.writeFile(`${target}/credential.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: credential.id,
				name: credential.name,
				target,
			});
		}

		return entries;
	}
}
