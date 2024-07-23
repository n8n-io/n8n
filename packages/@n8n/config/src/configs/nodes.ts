import { Config, Env, Nested } from '../decorators';

function isStringArray(input: unknown): input is string[] {
	return Array.isArray(input) && input.every((item) => typeof item === 'string');
}

class JsonStringArray extends Array<string> {
	constructor(str: string) {
		super();

		let parsed: unknown;

		try {
			parsed = JSON.parse(str);
		} catch {
			return [];
		}

		return isStringArray(parsed) ? parsed : [];
	}
}

@Config
class CommunityPackagesConfig {
	/** Whether to enable community packages */
	@Env('N8N_COMMUNITY_PACKAGES_ENABLED')
	enabled: boolean = true;
}

@Config
export class NodesConfig {
	/** Node types to load. Includes all if unspecified. @example '["n8n-nodes-base.hackerNews"]' */
	@Env('NODES_INCLUDE')
	readonly include: JsonStringArray = [];

	/** Node types not to load. Excludes none if unspecified. @example '["n8n-nodes-base.hackerNews"]' */
	@Env('NODES_EXCLUDE')
	readonly exclude: JsonStringArray = [];

	/** Node type to use as error trigger */
	@Env('NODES_ERROR_TRIGGER_TYPE')
	readonly errorTriggerType: string = 'n8n-nodes-base.errorTrigger';

	@Nested
	readonly communityPackages: CommunityPackagesConfig;
}
