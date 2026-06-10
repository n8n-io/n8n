import { Service } from '@n8n/di';

import type {
	N8nPackagesRegistryProvider,
	N8nPackagesRegistryProviderType,
} from '../n8n-packages-registry.types';
import { GitPackagesRegistryProvider } from './git-packages-registry.provider';
import { S3PackagesRegistryProvider } from './s3-packages-registry.provider';
import { SourceControlPackagesRegistryProvider } from './source-control-packages-registry.provider';

@Service()
export class N8nPackagesRegistryProviders {
	private readonly providers: Record<N8nPackagesRegistryProviderType, N8nPackagesRegistryProvider>;

	constructor(
		sourceControlProvider: SourceControlPackagesRegistryProvider,
		gitProvider: GitPackagesRegistryProvider,
		s3Provider: S3PackagesRegistryProvider,
	) {
		this.providers = {
			'source-control': sourceControlProvider,
			git: gitProvider,
			s3: s3Provider,
		};
	}

	getProvider(type: N8nPackagesRegistryProviderType): N8nPackagesRegistryProvider | undefined {
		return this.providers[type];
	}
}
