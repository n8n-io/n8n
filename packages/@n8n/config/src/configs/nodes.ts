import { Config, Env, Nested } from '../decorators';

@Config
class CommunityPackagesConfig {
	/** Whether to enable community packages */
	@Env('N8N_COMMUNITY_PACKAGES_ENABLED')
	enabled: boolean = true;
}

@Config
export class NodesConfig {
	/** Node types to load */
	@Env('NODES_INCLUDE')
	readonly include: string | undefined = undefined;

	/** Node types not to load */
	@Env('NODES_EXCLUDE')
	readonly exclude: string | undefined = undefined;

	/** Node type to use as error trigger */
	@Env('NODES_ERROR_TRIGGER_TYPE')
	readonly errorTriggerType: string = 'n8n-nodes-base.errorTrigger';

	@Nested
	readonly communityPackages: CommunityPackagesConfig;
}
