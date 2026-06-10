import { Service } from '@n8n/di';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type {
	InitializedN8nPackagesRegistry,
	N8nPackagesRegistryConnection,
	N8nPackagesRegistryProvider,
} from '../n8n-packages-registry.types';

@Service()
export class GitPackagesRegistryProvider implements N8nPackagesRegistryProvider {
	readonly type = 'git' as const;

	async init(connection: N8nPackagesRegistryConnection): Promise<InitializedN8nPackagesRegistry> {
		if (!connection.config.repositoryUrl) {
			throw new UnprocessableRequestError('Git package registry is missing repositoryUrl');
		}

		return {
			connection,
			listProjects: async () => await this.throwNotImplemented(),
			getImportableChangesGroupedByProject: async () => await this.throwNotImplemented(),
			importProjectChanges: async () => await this.throwNotImplemented(),
		};
	}

	private async throwNotImplemented(): Promise<never> {
		throw new UnprocessableRequestError('Git package registries are not implemented yet');
	}
}
