import { Service } from '@n8n/di';

import type {
	N8nPackagesRegistryProvider,
	N8nPackagesRegistryProviderType,
} from '../n8n-packages-registry.types';
import { GitPackagesRegistryProvider } from './git-packages-registry.provider';
import { SourceControlPackagesRegistryProvider } from './source-control-packages-registry.provider';

@Service()
export class N8nPackagesRegistryProviders {
	private readonly providers: Record<N8nPackagesRegistryProviderType, N8nPackagesRegistryProvider>;

	constructor(
		sourceControlProvider: SourceControlPackagesRegistryProvider,
		gitProvider: GitPackagesRegistryProvider,
	) {
		this.providers = {
			'source-control': sourceControlProvider,
			git: gitProvider,
		};
	}

	getProvider(type: N8nPackagesRegistryProviderType): N8nPackagesRegistryProvider | undefined {
		return this.providers[type];
	}
}
