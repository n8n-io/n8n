import type { GymAdmin } from './gym-admin';
import { LinearHydrator } from './hydrator';
import { LINEAR_READ_TOOLS, LINEAR_WRITE_TOOLS } from './linear-tools';
import type { McpCaller } from './mcp-upstream';
import { NotionHydrator } from './notion-hydrator';
import { NOTION_READ_TOOLS, NOTION_WRITE_TOOLS } from './notion-tools';
import type { Hydrator } from './router';

export interface GuardServiceProfile {
	name: string;
	// Host of the real MCP server. Also the Host header sent to the gym.
	host: string;
	// Local gym addresses. Env vars override them, see mcp-guard.service.ts.
	defaultAdminUrl: string;
	defaultGymMcpUrl: string;
	readTools: ReadonlySet<string>;
	writeTools: ReadonlySet<string>;
	// How the gym issues a bearer for its MCP, and where the bearer sits in the answer.
	credentialKind: string;
	credentialField: string;
	// The gym issues a credential only for a tenant with an account. Seed one placeholder.
	placeholderSeed: unknown;
	createHydrator(deps: { admin: GymAdmin; tenant: string; upstream: McpCaller }): Hydrator;
}

export const LINEAR_PROFILE: GuardServiceProfile = {
	name: 'linear',
	host: 'mcp.linear.app',
	defaultAdminUrl: 'http://127.0.0.1:9090',
	defaultGymMcpUrl: 'http://127.0.0.1:8080/mcp',
	readTools: LINEAR_READ_TOOLS,
	writeTools: LINEAR_WRITE_TOOLS,
	credentialKind: 'mcp_oauth',
	credentialField: 'access_token',
	placeholderSeed: {
		world_version: 1,
		native: {
			linear: {
				users: [
					{
						id: '00000000-0000-4000-8000-000000000001',
						ref: 'user:guard',
						email: 'guard@unknown.invalid',
						name: 'Guard',
					},
				],
			},
		},
	},
	createHydrator: (deps) => new LinearHydrator(deps),
};

export const NOTION_PROFILE: GuardServiceProfile = {
	name: 'notion',
	host: 'mcp.notion.com',
	defaultAdminUrl: 'http://127.0.0.1:9091',
	defaultGymMcpUrl: 'http://127.0.0.1:8081/mcp',
	readTools: NOTION_READ_TOOLS,
	writeTools: NOTION_WRITE_TOOLS,
	// The raw MCP bearer. Only an OAuth bearer may create pages without a parent.
	credentialKind: 'mcp_oauth',
	credentialField: 'access_token',
	placeholderSeed: { world_version: 1, persona: { name: 'Guard', email: 'guard@unknown.invalid' } },
	createHydrator: (deps) => new NotionHydrator(deps),
};

export const GUARD_PROFILES: readonly GuardServiceProfile[] = [LINEAR_PROFILE, NOTION_PROFILE];
