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

	/** NPM registry URL to pull community packages from */
	@Env('N8N_COMMUNITY_PACKAGES_REGISTRY')
	registry: string = 'https://registry.npmjs.org';

	/** Whether to reinstall any missing community packages */
	@Env('N8N_REINSTALL_MISSING_PACKAGES')
	reinstallMissing: boolean = false;

	/** Whether to allow community packages as tools for AI agents */
	@Env('N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE')
	allowToolUsage: boolean = false;
}

@Config
export class NodesConfig {
	/** Node types to load. Includes all if unspecified. @example '["n8n-nodes-base.hackerNews"]' */
	@Env('NODES_INCLUDE')
	include: JsonStringArray = [];

	/** Node types not to load. Excludes none if unspecified. @example '["n8n-nodes-base.hackerNews"]' */
	@Env('NODES_EXCLUDE')
	exclude: JsonStringArray = [];

	/** Node type to use as error trigger */
	@Env('NODES_ERROR_TRIGGER_TYPE')
	errorTriggerType: string = 'n8n-nodes-base.errorTrigger';

	@Nested
	communityPackages: CommunityPackagesConfig;
}
