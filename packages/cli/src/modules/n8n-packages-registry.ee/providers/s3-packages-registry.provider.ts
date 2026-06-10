import { Service } from '@n8n/di';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type {
	InitializedN8nPackagesRegistry,
	N8nPackagesRegistryConnection,
	N8nPackagesRegistryProvider,
} from '../n8n-packages-registry.types';

@Service()
export class S3PackagesRegistryProvider implements N8nPackagesRegistryProvider {
	readonly type = 's3' as const;

	async init(connection: N8nPackagesRegistryConnection): Promise<InitializedN8nPackagesRegistry> {
		if (!connection.config.bucketName) {
			throw new UnprocessableRequestError('S3 package registry is missing bucketName');
		}

		return {
			connection,
			listProjects: async () => await this.throwNotImplemented(),
			getImportableChangesGroupedByProject: async () => await this.throwNotImplemented(),
			importProjectChanges: async () => await this.throwNotImplemented(),
		};
	}

	private async throwNotImplemented(): Promise<never> {
		throw new UnprocessableRequestError('S3 package registries are not implemented yet');
	}
}
