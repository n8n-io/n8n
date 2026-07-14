import type { ListQueryDb, ScopesField, User } from '@n8n/db';
import z from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { ListQuery } from '@/requests';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';

const MAX_RESULTS = 200;

const inputSchema = {
	limit: createLimitSchema(MAX_RESULTS),
	query: z.string().optional().describe('Filter credentials by name (partial match)'),
	type: z
		.string()
		.optional()
		.describe('Filter by credential type (e.g. "slackApi", "httpHeaderAuth"). Partial match.'),
	projectId: z
		.string()
		.optional()
		.describe('Restrict results to credentials belonging to this project'),
	onlySharedWithMe: z
		.boolean()
		.optional()
		.describe('Only return credentials shared directly with the current user'),
} satisfies z.ZodRawShape;

const homeProjectSchema = z
	.object({
		id: z.string().describe('The unique identifier of the project'),
		name: z.string().describe('The name of the project'),
		type: z
			.string()
			.describe(
				"The project type. 'personal' is a user's private project; 'team' is a shared project accessible to multiple users.",
			),
	})
	.nullable()
	.describe('The project that owns the credential, if available');

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the credential'),
				name: z.string().describe('The name of the credential'),
				type: z.string().describe('The credential type (e.g. "slackApi")'),
				scopes: z
					.array(z.string())
					.describe('The user permissions on this credential (e.g. "credential:read")'),
				isManaged: z
					.boolean()
					.describe('Whether the credential is managed by n8n and cannot be edited by the user'),
				isGlobal: z.boolean().describe('Whether the credential is available to all users'),
				homeProject: homeProjectSchema,
			}),
		)
		.describe('List of credentials accessible to the current user'),
	count: z.number().int().min(0).describe('Number of credentials returned'),
	error: z.string().optional().describe('Error message when the tool failed'),
} satisfies z.ZodRawShape;

export type ListCredentialsParams = {
	limit?: number;
	query?: string;
	type?: string;
	projectId?: string;
	onlySharedWithMe?: boolean;
};

export type ListCredentialsItem = {
	id: string;
	name: string;
	type: string;
	scopes: string[];
	isManaged: boolean;
	isGlobal: boolean;
	homeProject: { id: string; name: string; type: string } | null;
};

export type ListCredentialsResult = {
	data: ListCredentialsItem[];
	count: number;
	error?: string;
};

export const createListCredentialsTool = (
	user: User,
	credentialsService: CredentialsService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'list_credentials',
	config: {
		description:
			'List credentials the current user can access. Use this to find a credential ID before referencing it from a workflow node. Never returns credential secret data.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'List Credentials',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		limit = MAX_RESULTS,
		query,
		type,
		projectId,
		onlySharedWithMe = false,
	}: ListCredentialsParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'list_credentials',
			parameters: { limit, query, type, projectId, onlySharedWithMe },
		};

		try {
			const payload = await listCredentials(user, credentialsService, {
				limit,
				query,
				type,
				projectId,
				onlySharedWithMe,
			});

			telemetryPayload.results = {
				success: true,
				data: { count: payload.count },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output: ListCredentialsResult = {
				data: [],
				count: 0,
				error: errorMessage,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});

export async function listCredentials(
	user: User,
	credentialsService: CredentialsService,
	{ limit = MAX_RESULTS, query, type, projectId, onlySharedWithMe = false }: ListCredentialsParams,
): Promise<ListCredentialsResult> {
	const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);

	const filter: ListQuery.Options['filter'] = {
		...(query ? { name: query } : {}),
		...(type ? { type } : {}),
		...(projectId ? { projectId } : {}),
	};

	const listQueryOptions: ListQuery.Options = {
		take: safeLimit,
		...(Object.keys(filter ?? {}).length ? { filter } : {}),
	};

	const credentials = await credentialsService.getMany(user, {
		listQueryOptions,
		includeScopes: true,
		includeData: false,
		includeGlobal: !onlySharedWithMe,
		onlySharedWithMe,
	});

	const enriched = credentials as Array<
		ListQueryDb.Credentials.WithOwnedByAndSharedWith & ScopesField
	>;

	const data: ListCredentialsItem[] = enriched.map((c) => ({
		id: c.id,
		name: c.name,
		type: c.type,
		scopes: c.scopes ?? [],
		isManaged: c.isManaged,
		isGlobal: c.isGlobal,
		homeProject: c.homeProject
			? { id: c.homeProject.id, name: c.homeProject.name, type: c.homeProject.type }
			: null,
	}));

	return { data, count: data.length };
}
