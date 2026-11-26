import type { InstanceTypeAccessResponse, UninstalledCommunityNodeAccess } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

type CatalogNode = Omit<UninstalledCommunityNodeAccess, 'access' | 'matchedRuleId'>;

/**
 * The verified community nodes that this instance has not installed. The only class of this
 * module that reads the community packages module, which can be disabled.
 */
@Service()
export class UninstalledCommunityNodes {
	constructor(private readonly logger: Logger) {}

	async list(installedNames: ReadonlySet<string>): Promise<CatalogNode[]> {
		try {
			const { CommunityPackagesConfig } = await import(
				'@/modules/community-packages/community-packages.config.js'
			);
			const config = Container.get(CommunityPackagesConfig);
			// Checked first, so a disabled module never builds its services only to return nothing.
			if (!config.enabled || !config.verifiedEnabled) return [];

			const { CommunityNodeTypesService } = await import(
				'@/modules/community-packages/community-node-types.service.js'
			);

			return Container.get(CommunityNodeTypesService)
				.getCachedCommunityNodeTypes()
				.filter((entry) => !installedNames.has(entry.name))
				.map(({ name, displayName, nodeDescription }) => ({
					// `entry.name`, not `nodeDescription.name`: the catalog describes an uninstalled node
					// under a `-preview` package, but a policy rule names the type it gets on install.
					name,
					displayName,
					icon: nodeDescription.icon,
					iconUrl: nodeDescription.iconUrl,
					iconColor: nodeDescription.iconColor,
				}));
		} catch (error) {
			this.logger.warn('Could not read the community node catalog', { error });
			return [];
		}
	}
}

/** Moves the rows of the catalog nodes out of `types`, which lists installed types only. */
export function withUninstalledCommunityTypes(
	access: InstanceTypeAccessResponse,
	catalogNodes: readonly CatalogNode[],
): InstanceTypeAccessResponse {
	const catalogByName = new Map(catalogNodes.map((node) => [node.name, node]));
	const types: InstanceTypeAccessResponse['types'] = [];
	const uninstalledCommunityTypes: NonNullable<
		InstanceTypeAccessResponse['uninstalledCommunityTypes']
	> = [];

	for (const type of access.types) {
		const catalogNode = catalogByName.get(type.name);
		if (catalogNode) uninstalledCommunityTypes.push({ ...type, ...catalogNode });
		else types.push(type);
	}

	return { ...access, types, uninstalledCommunityTypes };
}
