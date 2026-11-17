import type { GymAdmin } from './gym-admin';
import { LinearHydrator } from './hydrator';
import { LINEAR_INSTRUCTIONS, NOTION_INSTRUCTIONS } from './hydration-prompts';
import { linearLookups, notionLookups, withUserEmails } from './linear-lookups';
import { LINEAR_READ_TOOLS, LINEAR_WRITE_TOOLS } from './linear-tools';
import type { McpCaller } from './mcp-upstream';
import { withTitles } from './notion-finalize';
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
	// Args for the real call of a read. Return more than the agent asked for when the hydration needs it.
	upstreamReadArgs?: (tool: string, args: Record<string, unknown>) => Record<string, unknown>;
	// Real reads for the objects that a call needs in the gym: the ones its args name and its result shows.
	lookups?: (
		tool: string,
		args: Record<string, unknown>,
		result?: unknown,
	) => Array<{ tool: string; args: Record<string, unknown> }>;
	// Last change to an overlay of the plan hydrator, after its checks. Optional.
	finalize?: (overlay: Record<string, unknown>) => Record<string, unknown>;
	// Lookup tools that the gym answers before the real service does, see PlanHydratorDeps.
	gymFirst?: ReadonlySet<string>;
	// Service part of the instructions of the hydration agent and of the plan hydrator.
	instructions: string;
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
	// A `fields` list limits the result, and the real service leaves out `uuid` unless it is listed.
	// Without the list the real service returns its default fields, which include the ids.
	lookups: linearLookups,
	finalize: withUserEmails,
	gymFirst: new Set(['get_issue']),
	upstreamReadArgs: (_tool, args) =>
		Array.isArray(args.fields)
			? Object.fromEntries(Object.entries(args).filter(([key]) => key !== 'fields'))
			: args,
	instructions: LINEAR_INSTRUCTIONS,
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
	lookups: notionLookups,
	finalize: withTitles,
	instructions: NOTION_INSTRUCTIONS,
	createHydrator: (deps) => new NotionHydrator(deps),
};

export const GUARD_PROFILES: readonly GuardServiceProfile[] = [LINEAR_PROFILE, NOTION_PROFILE];
