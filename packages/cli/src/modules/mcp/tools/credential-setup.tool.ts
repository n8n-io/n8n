import {
	CREDENTIAL_SETUP_URI,
	type CredentialSetupField,
	type CredentialSetupFieldOption,
	type CredentialSetupOutput,
	type CredentialSetupSafeResult,
	type CredentialSetupSupportedFieldType,
} from '@n8n/mcp-apps/server';
import type { User } from '@n8n/db';
import type { CallToolResult, RequestId } from '@modelcontextprotocol/sdk/types.js';
import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeProperties,
} from 'n8n-workflow';
import { jsonStringify, NodeHelpers } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { CreateCsrfStateData, OauthService } from '@/oauth/oauth.service';
import type { Telemetry } from '@/telemetry';

export const SETUP_CREDENTIAL_TOOL = 'setup_credential';
export const CREDENTIAL_SETUP_DESCRIBE_TOOL = 'credential_setup_describe';
export const CREDENTIAL_SETUP_CREATE_TOOL = 'credential_setup_create';
export const CREDENTIAL_SETUP_OAUTH_AUTHORIZE_TOOL = 'credential_setup_oauth_authorize';
export const CREDENTIAL_SETUP_STATUS_TOOL = 'credential_setup_status';
export const CREDENTIAL_SETUP_TEST_TOOL = 'credential_setup_test';
export const CREDENTIAL_SETUP_DELETE_DRAFT_TOOL = 'credential_setup_delete_draft';

const APP_ONLY_TOOL_META = {
	ui: { visibility: ['app'] },
} satisfies Record<string, unknown>;

const setupCredentialInputSchema = {
	credentialType: z.string().min(1).describe('The n8n credential type name to set up'),
	projectId: z.string().optional().describe('Project ID where the credential should be created'),
	suggestedName: z.string().optional().describe('Suggested credential name'),
	nodeType: z.string().optional().describe('Node type that needs this credential'),
	purpose: z.string().optional().describe('Short explanation of why this credential is needed'),
} satisfies z.ZodRawShape;

const credentialSetupCreateInputSchema = {
	setupSessionId: z.string().optional(),
	credentialType: z.string().min(1),
	name: z.string().min(1).max(128),
	projectId: z.string().optional(),
	data: z.record(z.string(), z.unknown()).default({}),
} satisfies z.ZodRawShape;

const credentialSetupCredentialIdInputSchema = {
	setupSessionId: z.string().optional(),
	credentialId: z.string().min(1),
} satisfies z.ZodRawShape;

const credentialSetupTestInputSchema = {
	setupSessionId: z.string().optional(),
	credentialId: z.string().min(1),
	data: z.record(z.string(), z.unknown()).optional(),
} satisfies z.ZodRawShape;

const credentialSetupDeleteDraftInputSchema = {
	setupSessionId: z.string().optional(),
	credentialId: z.string().optional(),
} satisfies z.ZodRawShape;

const credentialSetupDescribeInputSchema = {
	setupSessionId: z.string().optional(),
	credentialType: z.string().optional(),
	projectId: z.string().optional(),
	suggestedName: z.string().optional(),
	nodeType: z.string().optional(),
	purpose: z.string().optional(),
} satisfies z.ZodRawShape;

const credentialSetupFieldOptionSchema = z.object({
	name: z.string(),
	value: z.union([z.string(), z.number(), z.boolean()]),
	description: z.string().optional(),
});

const credentialSetupFieldSchema = z.object({
	name: z.string(),
	displayName: z.string(),
	type: z.enum(['string', 'number', 'boolean', 'options', 'multiOptions', 'json', 'notice']),
	required: z.boolean(),
	password: z.boolean(),
	default: z.unknown().optional(),
	description: z.string().optional(),
	options: z.array(credentialSetupFieldOptionSchema).optional(),
});

const credentialSetupOutputSchema = {
	setupSessionId: z.string().optional(),
	credentialType: z.string(),
	credentialDisplayName: z.string(),
	credentialName: z.string(),
	projectId: z.string().optional(),
	nodeType: z.string().optional(),
	purpose: z.string().optional(),
	isOAuth: z.boolean(),
	oauthVersion: z.enum(['oauth1', 'oauth2']).optional(),
	fields: z.array(credentialSetupFieldSchema),
	hasUnsupportedFields: z.boolean(),
	unsupportedFieldNames: z.array(z.string()),
	fallbackUrl: z.string(),
} satisfies z.ZodRawShape;

const credentialSetupSafeResultSchema = {
	credentialId: z.string().optional(),
	credentialName: z.string().optional(),
	credentialType: z.string(),
	status: z.enum([
		'setup_required',
		'created',
		'authorization_required',
		'pending',
		'connected',
		'tested',
		'deleted',
		'error',
	]),
	connected: z.boolean().optional(),
	authorizationUrl: z.string().optional(),
	fallbackUrl: z.string().optional(),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

type CredentialSetupToolDependencies = {
	user: User;
	credentialTypes: CredentialTypes;
	credentialsService: CredentialsService;
	credentialsFinderService: CredentialsFinderService;
	oauthService: OauthService;
	telemetry: Telemetry;
	instanceBaseUrl: string;
};

type SetupCredentialInput = z.infer<z.ZodObject<typeof setupCredentialInputSchema>>;
type CredentialSetupCreateInput = z.infer<z.ZodObject<typeof credentialSetupCreateInputSchema>>;
type CredentialSetupDescribeInput = z.infer<z.ZodObject<typeof credentialSetupDescribeInputSchema>>;
type CredentialSetupCredentialIdInput = z.infer<
	z.ZodObject<typeof credentialSetupCredentialIdInputSchema>
>;
type CredentialSetupTestInput = z.infer<z.ZodObject<typeof credentialSetupTestInputSchema>>;
type CredentialSetupDeleteDraftInput = z.infer<
	z.ZodObject<typeof credentialSetupDeleteDraftInputSchema>
>;

type PendingCredentialSetupSession = {
	userId: string;
	setupOutput: CredentialSetupOutput;
	resolve: (result: CallToolResult) => void;
	timeout: NodeJS.Timeout;
};
type PendingCredentialSetupSessionEntry = [
	setupSessionId: string,
	session: PendingCredentialSetupSession,
];

const credentialSetupSessions = new Map<string, PendingCredentialSetupSession>();
const CREDENTIAL_SETUP_SESSION_TTL_MS = 15 * 60 * 1000;

export function createCredentialSetupTools(
	dependencies: CredentialSetupToolDependencies,
): Array<ToolDefinition> {
	return [
		createSetupCredentialTool(dependencies),
		createCredentialSetupDescribeTool(dependencies),
		createCredentialSetupCreateTool(dependencies),
		createCredentialSetupOauthAuthorizeTool(dependencies),
		createCredentialSetupStatusTool(dependencies),
		createCredentialSetupTestTool(dependencies),
		createCredentialSetupDeleteDraftTool(dependencies),
	];
}

export function createSetupCredentialTool({
	user,
	credentialTypes,
	telemetry,
	instanceBaseUrl,
}: CredentialSetupToolDependencies): ToolDefinition<typeof setupCredentialInputSchema> {
	return {
		name: SETUP_CREDENTIAL_TOOL,
		config: {
			description:
				'Open an n8n credential setup form for the user. The form collects secrets inside the MCP App only; do not ask the user to paste secrets into chat.',
			inputSchema: setupCredentialInputSchema,
			outputSchema: credentialSetupSafeResultSchema,
			annotations: {
				title: 'Set up credential',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: {
				ui: { resourceUri: CREDENTIAL_SETUP_URI },
			},
		},
		handler: async (input: SetupCredentialInput, extra) => {
			const setupSessionId = toSetupSessionId(extra.requestId);
			const telemetryPayload = createTelemetryPayload(user, SETUP_CREDENTIAL_TOOL, {
				credentialType: input.credentialType,
				projectId: input.projectId,
				nodeType: input.nodeType,
			});

			try {
				const output = buildCredentialSetupOutput({
					credentialTypes,
					instanceBaseUrl,
					input: { ...input, setupSessionId },
				});

				return await waitForCredentialSetupCompletion({
					userId: user.id,
					setupSessionId,
					setupOutput: output,
					telemetry,
					telemetryPayload,
					signal: extra.signal,
				});
			} catch (error) {
				return createSafeErrorResult(
					telemetry,
					telemetryPayload,
					'credential_schema_unavailable',
					error,
					{
						credentialType: input.credentialType,
					},
				);
			}
		},
	};
}

function createCredentialSetupDescribeTool({
	user,
	credentialTypes,
	instanceBaseUrl,
}: CredentialSetupToolDependencies): ToolDefinition<typeof credentialSetupDescribeInputSchema> {
	return {
		name: CREDENTIAL_SETUP_DESCRIBE_TOOL,
		config: {
			description: 'Fetch safe credential setup schema for the MCP App.',
			inputSchema: credentialSetupDescribeInputSchema,
			outputSchema: credentialSetupOutputSchema,
			annotations: {
				title: 'Describe credential setup',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: APP_ONLY_TOOL_META,
		},
		handler: async (input: CredentialSetupDescribeInput) => {
			const session = findCredentialSetupSession(user.id, input);
			const setupOutput =
				session?.setupOutput ??
				buildCredentialSetupOutputFromDescribeInput({
					credentialTypes,
					instanceBaseUrl,
					input,
				});

			if (!setupOutput) {
				return createSafeToolResult(
					{
						credentialType: 'unknown',
						status: 'error',
						error: 'credential_setup_session_not_found',
					},
					true,
				);
			}

			return {
				content: createTextContent(jsonStringify(setupOutput)),
				structuredContent: setupOutput,
			};
		},
	};
}

function createCredentialSetupCreateTool({
	user,
	credentialsService,
	telemetry,
}: CredentialSetupToolDependencies): ToolDefinition<typeof credentialSetupCreateInputSchema> {
	return {
		name: CREDENTIAL_SETUP_CREATE_TOOL,
		config: {
			description: 'Create an n8n credential from MCP App form data.',
			inputSchema: credentialSetupCreateInputSchema,
			outputSchema: credentialSetupSafeResultSchema,
			annotations: {
				title: 'Create credential from setup app',
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: APP_ONLY_TOOL_META,
		},
		handler: async ({
			setupSessionId,
			credentialType,
			name,
			projectId,
			data,
		}: CredentialSetupCreateInput) => {
			const telemetryPayload = createTelemetryPayload(user, CREDENTIAL_SETUP_CREATE_TOOL, {
				credentialType,
				projectId,
			});

			try {
				const credential = await credentialsService.createUnmanagedCredential(
					{
						name,
						type: credentialType,
						projectId,
						data,
					},
					user,
				);
				const result: CredentialSetupSafeResult = {
					credentialId: credential.id,
					credentialName: credential.name,
					credentialType: credential.type,
					status: 'created',
				};
				const pendingSession = findCredentialSetupSessionEntryForCredential(user.id, {
					setupSessionId,
					credentialType: credential.type,
					credentialName: credential.name,
					projectId,
				});
				if (pendingSession && !pendingSession[1].setupOutput.isOAuth) {
					completeCredentialSetupSessionEntry(pendingSession, result);
				}
				trackCredentialSetupSuccess(telemetry, telemetryPayload, {
					credential_id: result.credentialId,
					credential_type: result.credentialType,
					project_id: projectId,
					mode: 'manual',
				});

				return createSafeToolResult(result);
			} catch (error) {
				return createSafeToolErrorResult(
					telemetry,
					telemetryPayload,
					'credential_create_failed',
					error,
					credentialType,
				);
			}
		},
	};
}

function createCredentialSetupOauthAuthorizeTool({
	user,
	credentialTypes,
	credentialsFinderService,
	oauthService,
	telemetry,
	instanceBaseUrl,
}: CredentialSetupToolDependencies): ToolDefinition<typeof credentialSetupCredentialIdInputSchema> {
	return {
		name: CREDENTIAL_SETUP_OAUTH_AUTHORIZE_TOOL,
		config: {
			description: 'Create an OAuth authorization URL for a credential setup app draft.',
			inputSchema: credentialSetupCredentialIdInputSchema,
			outputSchema: credentialSetupSafeResultSchema,
			annotations: {
				title: 'Authorize setup credential',
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
			_meta: APP_ONLY_TOOL_META,
		},
		handler: async ({ credentialId }: CredentialSetupCredentialIdInput) => {
			const telemetryPayload = createTelemetryPayload(user, CREDENTIAL_SETUP_OAUTH_AUTHORIZE_TOOL, {
				credentialId,
			});

			try {
				const credential = await credentialsFinderService.findCredentialForUser(
					credentialId,
					user,
					['credential:read'],
				);
				if (!credential) {
					throw new Error('credential_not_found');
				}

				const oauthVersion = getOAuthVersion(credential.type, credentialTypes);
				if (!oauthVersion) {
					throw new Error('credential_is_not_oauth');
				}
				const csrfData: CreateCsrfStateData = {
					cid: credential.id,
					origin: 'static-credential',
					userId: user.id,
				};
				const authorizationUrl =
					oauthVersion === 'oauth1'
						? await oauthService.generateAOauth1AuthUri(credential, csrfData)
						: await oauthService.generateAOauth2AuthUri(credential, csrfData);
				const result: CredentialSetupSafeResult = {
					credentialId: credential.id,
					credentialName: credential.name,
					credentialType: credential.type,
					status: 'authorization_required',
					authorizationUrl,
					fallbackUrl: getCredentialFallbackUrl(instanceBaseUrl, credential.id),
				};
				trackCredentialSetupSuccess(telemetry, telemetryPayload, {
					credential_id: result.credentialId,
					credential_type: result.credentialType,
					mode: 'oauth',
				});

				return createSafeToolResult(result);
			} catch (error) {
				return createSafeToolErrorResult(
					telemetry,
					telemetryPayload,
					'oauth_authorization_failed',
					error,
					'unknown',
				);
			}
		},
	};
}

function createCredentialSetupStatusTool({
	user,
	credentialsService,
	telemetry,
	instanceBaseUrl,
}: CredentialSetupToolDependencies): ToolDefinition<typeof credentialSetupCredentialIdInputSchema> {
	return {
		name: CREDENTIAL_SETUP_STATUS_TOOL,
		config: {
			description: 'Check whether an MCP App credential setup draft is connected.',
			inputSchema: credentialSetupCredentialIdInputSchema,
			outputSchema: credentialSetupSafeResultSchema,
			annotations: {
				title: 'Check setup credential status',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: APP_ONLY_TOOL_META,
		},
		handler: async ({ credentialId, setupSessionId }: CredentialSetupCredentialIdInput) => {
			const telemetryPayload = createTelemetryPayload(user, CREDENTIAL_SETUP_STATUS_TOOL, {
				credentialId,
			});

			try {
				const credential = await credentialsService.getOne(user, credentialId, true);
				const connected = isCredentialConnected('data' in credential ? credential.data : undefined);
				const result: CredentialSetupSafeResult = {
					credentialId: credential.id,
					credentialName: credential.name,
					credentialType: credential.type,
					status: connected ? 'connected' : 'pending',
					connected,
					fallbackUrl: getCredentialFallbackUrl(instanceBaseUrl, credential.id),
				};
				if (connected) {
					const pendingSession = findCredentialSetupSessionEntryForCredential(user.id, {
						setupSessionId,
						credentialType: credential.type,
						credentialName: credential.name,
					});
					if (pendingSession) {
						completeCredentialSetupSessionEntry(pendingSession, result);
					}
				}
				trackCredentialSetupSuccess(telemetry, telemetryPayload, {
					credential_id: result.credentialId,
					credential_type: result.credentialType,
					mode: connected ? 'oauth_connected' : 'oauth_pending',
				});

				return createSafeToolResult(result);
			} catch (error) {
				return createSafeToolErrorResult(
					telemetry,
					telemetryPayload,
					'credential_status_failed',
					error,
					'unknown',
				);
			}
		},
	};
}

function createCredentialSetupTestTool({
	user,
	credentialsService,
	telemetry,
}: CredentialSetupToolDependencies): ToolDefinition<typeof credentialSetupTestInputSchema> {
	return {
		name: CREDENTIAL_SETUP_TEST_TOOL,
		config: {
			description: 'Test an MCP App credential setup draft without returning secret data.',
			inputSchema: credentialSetupTestInputSchema,
			outputSchema: credentialSetupSafeResultSchema,
			annotations: {
				title: 'Test setup credential',
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
			_meta: APP_ONLY_TOOL_META,
		},
		handler: async ({ credentialId, data }: CredentialSetupTestInput) => {
			const telemetryPayload = createTelemetryPayload(user, CREDENTIAL_SETUP_TEST_TOOL, {
				credentialId,
			});

			try {
				const credential = await credentialsService.getOne(user, credentialId, false);
				const testResult = await credentialsService.testWithCredentials(user, {
					id: credential.id,
					name: credential.name,
					type: credential.type,
					data: toCredentialData(data ?? {}),
				});
				const success = testResult.status === 'OK';
				const result: CredentialSetupSafeResult = {
					credentialId: credential.id,
					credentialName: credential.name,
					credentialType: credential.type,
					status: success ? 'tested' : 'error',
					connected: success,
					error: success ? undefined : 'credential_test_failed',
				};
				trackCredentialSetupResult(telemetry, telemetryPayload, success, {
					credential_id: result.credentialId,
					credential_type: result.credentialType,
					mode: 'test',
				});

				return createSafeToolResult(result, !success);
			} catch (error) {
				return createSafeToolErrorResult(
					telemetry,
					telemetryPayload,
					'credential_test_failed',
					error,
					'unknown',
				);
			}
		},
	};
}

function createCredentialSetupDeleteDraftTool({
	user,
	credentialsService,
	telemetry,
}: CredentialSetupToolDependencies): ToolDefinition<typeof credentialSetupDeleteDraftInputSchema> {
	return {
		name: CREDENTIAL_SETUP_DELETE_DRAFT_TOOL,
		config: {
			description: 'Delete a credential draft created by the MCP App credential setup form.',
			inputSchema: credentialSetupDeleteDraftInputSchema,
			outputSchema: credentialSetupSafeResultSchema,
			annotations: {
				title: 'Delete setup credential draft',
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: APP_ONLY_TOOL_META,
		},
		handler: async ({ credentialId, setupSessionId }: CredentialSetupDeleteDraftInput) => {
			const telemetryPayload = createTelemetryPayload(user, CREDENTIAL_SETUP_DELETE_DRAFT_TOOL, {
				credentialId,
			});

			try {
				if (credentialId) {
					await credentialsService.delete(user, credentialId);
				}
				const result: CredentialSetupSafeResult = {
					credentialId,
					credentialType: 'unknown',
					status: 'deleted',
				};
				const pendingSession = findCredentialSetupSessionEntry(user.id, { setupSessionId });
				if (pendingSession) {
					completeCredentialSetupSessionEntry(pendingSession, {
						...result,
						status: 'error',
						error: 'credential_setup_cancelled',
					});
				}
				trackCredentialSetupSuccess(telemetry, telemetryPayload, {
					credential_id: credentialId,
					mode: 'delete_draft',
				});

				return createSafeToolResult(result);
			} catch (error) {
				return createSafeToolErrorResult(
					telemetry,
					telemetryPayload,
					'credential_delete_failed',
					error,
					'unknown',
				);
			}
		},
	};
}

export function buildCredentialSetupOutput({
	credentialTypes,
	instanceBaseUrl,
	input,
}: {
	credentialTypes: CredentialTypes;
	instanceBaseUrl: string;
	input: SetupCredentialInput & { setupSessionId?: string };
}): CredentialSetupOutput {
	const credentialType = credentialTypes.getByName(input.credentialType);
	const properties = getCredentialProperties(credentialTypes, input.credentialType);
	const overwrittenProperties = new Set(credentialType.__overwrittenProperties ?? []);
	const fields: CredentialSetupField[] = [];
	const unsupportedFieldNames: string[] = [];

	for (const property of properties) {
		if (property.type === 'hidden' || overwrittenProperties.has(property.name)) {
			continue;
		}

		const field = toCredentialSetupField(property);
		if (field) {
			fields.push(field);
			continue;
		}

		unsupportedFieldNames.push(property.displayName || property.name);
	}

	const oauthVersion = getOAuthVersion(input.credentialType, credentialTypes);

	return {
		setupSessionId: input.setupSessionId,
		credentialType: credentialType.name,
		credentialDisplayName: credentialType.displayName,
		credentialName: input.suggestedName ?? credentialType.displayName,
		projectId: input.projectId,
		nodeType: input.nodeType,
		purpose: input.purpose,
		isOAuth: oauthVersion !== undefined,
		oauthVersion,
		fields,
		hasUnsupportedFields: unsupportedFieldNames.length > 0,
		unsupportedFieldNames,
		fallbackUrl: getCredentialFallbackUrl(instanceBaseUrl),
	};
}

function buildCredentialSetupOutputFromDescribeInput({
	credentialTypes,
	instanceBaseUrl,
	input,
}: {
	credentialTypes: CredentialTypes;
	instanceBaseUrl: string;
	input: CredentialSetupDescribeInput;
}): CredentialSetupOutput | undefined {
	if (!input.credentialType) return undefined;

	return buildCredentialSetupOutput({
		credentialTypes,
		instanceBaseUrl,
		input: {
			credentialType: input.credentialType,
			projectId: input.projectId,
			suggestedName: input.suggestedName,
			nodeType: input.nodeType,
			purpose: input.purpose,
			setupSessionId: input.setupSessionId,
		},
	});
}

function getCredentialProperties(
	credentialTypes: Pick<CredentialTypes, 'getByName'>,
	typeName: string,
	visited = new Set<string>(),
): INodeProperties[] {
	if (visited.has(typeName)) {
		return [];
	}
	visited.add(typeName);

	const credentialType = credentialTypes.getByName(typeName);
	const properties: INodeProperties[] = [];
	for (const extendedTypeName of credentialType.extends ?? []) {
		NodeHelpers.mergeNodeProperties(
			properties,
			getCredentialProperties(credentialTypes, extendedTypeName, visited),
		);
	}
	NodeHelpers.mergeNodeProperties(properties, credentialType.properties);

	return properties;
}

function toCredentialSetupField(property: INodeProperties): CredentialSetupField | undefined {
	const fieldType = toCredentialSetupFieldType(property.type);
	if (!fieldType) {
		return undefined;
	}

	return {
		name: property.name,
		displayName: property.displayName || property.name,
		type: fieldType,
		required: Boolean(property.required),
		password: property.type === 'string' && property.typeOptions?.password === true,
		default: property.default,
		description: property.description,
		options:
			fieldType === 'options' || fieldType === 'multiOptions'
				? toCredentialSetupFieldOptions(property.options)
				: undefined,
	};
}

function toCredentialSetupFieldType(
	type: INodeProperties['type'],
): CredentialSetupSupportedFieldType | undefined {
	switch (type) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'options':
		case 'multiOptions':
		case 'json':
		case 'notice':
			return type;
		default:
			return undefined;
	}
}

function toCredentialSetupFieldOptions(
	options: INodeProperties['options'],
): CredentialSetupFieldOption[] | undefined {
	if (!Array.isArray(options)) {
		return undefined;
	}

	const setupOptions = options
		.map((option) => {
			if (!isRecord(option)) {
				return null;
			}

			const name = option.name;
			const value = option.value;
			if (typeof name !== 'string' || !isCredentialOptionValue(value)) {
				return null;
			}

			const setupOption: CredentialSetupFieldOption = {
				name,
				value,
			};
			if (typeof option.description === 'string') {
				setupOption.description = option.description;
			}

			return setupOption;
		})
		.filter((option): option is CredentialSetupFieldOption => option !== null);

	return setupOptions.length > 0 ? setupOptions : undefined;
}

function isCredentialOptionValue(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function getOAuthVersion(
	credentialType: string,
	credentialTypes: Pick<CredentialTypes, 'getParentTypes'>,
): 'oauth1' | 'oauth2' | undefined {
	const parentTypes = credentialTypes.getParentTypes(credentialType) ?? [];
	if (credentialType === 'oAuth1Api' || parentTypes.includes('oAuth1Api')) {
		return 'oauth1';
	}
	if (credentialType === 'oAuth2Api' || parentTypes.includes('oAuth2Api')) {
		return 'oauth2';
	}

	return undefined;
}

function isCredentialConnected(data: ICredentialDataDecryptedObject | undefined): boolean {
	return data?.oauthTokenData === true;
}

function toCredentialData(data: Record<string, unknown>): ICredentialDataDecryptedObject {
	const credentialData: ICredentialDataDecryptedObject = {};
	for (const [key, value] of Object.entries(data)) {
		if (isCredentialInformation(value)) {
			credentialData[key] = value;
		}
	}

	return credentialData;
}

function isCredentialInformation(value: unknown): value is CredentialInformation {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return true;
	}

	if (Array.isArray(value)) {
		return value.every((item) => typeof item === 'string' || isDataObject(item));
	}

	return isDataObject(value);
}

function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

function getCredentialFallbackUrl(instanceBaseUrl: string, credentialId?: string): string {
	const path = credentialId ? `/home/credentials/${credentialId}` : '/home/credentials';

	return new URL(path, instanceBaseUrl).toString();
}

function createTelemetryPayload(
	user: User,
	toolName: string,
	parameters: Record<string, unknown>,
): UserCalledMCPToolEventPayload {
	return {
		user_id: user.id,
		tool_name: toolName,
		parameters,
	};
}

function trackCredentialSetupSuccess(
	telemetry: Telemetry,
	payload: UserCalledMCPToolEventPayload,
	data: Record<string, unknown>,
): void {
	trackCredentialSetupResult(telemetry, payload, true, data);
}

function trackCredentialSetupResult(
	telemetry: Telemetry,
	payload: UserCalledMCPToolEventPayload,
	success: boolean,
	data: Record<string, unknown>,
): void {
	payload.results = {
		success,
		data,
	};
	telemetry.track(USER_CALLED_MCP_TOOL_EVENT, payload);
}

function createSafeErrorResult(
	telemetry: Telemetry,
	payload: UserCalledMCPToolEventPayload,
	errorLabel: string,
	error: unknown,
	resultBase: Pick<CredentialSetupSafeResult, 'credentialType'>,
) {
	const safeError = toSafeErrorLabel(errorLabel, error);
	payload.results = {
		success: false,
		error: safeError,
	};
	telemetry.track(USER_CALLED_MCP_TOOL_EVENT, payload);

	return createSafeToolResult(
		{
			...resultBase,
			status: 'error',
			error: safeError,
		},
		true,
	);
}

function createSafeToolErrorResult(
	telemetry: Telemetry,
	payload: UserCalledMCPToolEventPayload,
	errorLabel: string,
	error: unknown,
	credentialType: string,
) {
	return createSafeErrorResult(telemetry, payload, errorLabel, error, { credentialType });
}

function createSafeToolResult(result: CredentialSetupSafeResult, isError = false) {
	return {
		content: createTextContent(jsonStringify(result)),
		structuredContent: result,
		isError,
	};
}

function createTextContent(text: string): Array<{ type: 'text'; text: string }> {
	return [{ type: 'text', text }];
}

async function waitForCredentialSetupCompletion({
	userId,
	setupSessionId,
	setupOutput,
	telemetry,
	telemetryPayload,
	signal,
}: {
	userId: string;
	setupSessionId: string;
	setupOutput: CredentialSetupOutput;
	telemetry: Telemetry;
	telemetryPayload: UserCalledMCPToolEventPayload;
	signal: AbortSignal;
}): Promise<CallToolResult> {
	return await new Promise((resolve) => {
		const timeout = setTimeout(() => {
			credentialSetupSessions.delete(setupSessionId);
			const result: CredentialSetupSafeResult = {
				credentialType: setupOutput.credentialType,
				status: 'error',
				error: 'credential_setup_expired',
			};
			trackCredentialSetupResult(telemetry, telemetryPayload, false, {
				credential_type: setupOutput.credentialType,
				project_id: setupOutput.projectId,
				mode: 'expired',
			});
			resolve(createSafeToolResult(result, true));
		}, CREDENTIAL_SETUP_SESSION_TTL_MS);
		timeout.unref?.();

		const abort = () => {
			credentialSetupSessions.delete(setupSessionId);
			clearTimeout(timeout);
			const result: CredentialSetupSafeResult = {
				credentialType: setupOutput.credentialType,
				status: 'error',
				error: 'credential_setup_cancelled',
			};
			trackCredentialSetupResult(telemetry, telemetryPayload, false, {
				credential_type: setupOutput.credentialType,
				project_id: setupOutput.projectId,
				mode: 'cancelled',
			});
			resolve(createSafeToolResult(result, true));
		};

		if (signal.aborted) {
			abort();
			return;
		}
		signal.addEventListener('abort', abort, { once: true });

		credentialSetupSessions.set(setupSessionId, {
			userId,
			setupOutput,
			timeout,
			resolve: (result) => {
				signal.removeEventListener('abort', abort);
				clearTimeout(timeout);
				const safeResult = getSafeResultFromToolResult(result);
				trackCredentialSetupResult(telemetry, telemetryPayload, safeResult?.status !== 'error', {
					credential_id: safeResult?.credentialId,
					credential_type: safeResult?.credentialType ?? setupOutput.credentialType,
					project_id: setupOutput.projectId,
					mode: setupOutput.isOAuth ? 'oauth' : 'manual',
				});
				resolve(result);
			},
		});
	});
}

function completeCredentialSetupSessionEntry(
	[setupSessionId, session]: PendingCredentialSetupSessionEntry,
	result: CredentialSetupSafeResult,
): void {
	credentialSetupSessions.delete(setupSessionId);
	session.resolve(createSafeToolResult(result, result.status === 'error'));
}

function findCredentialSetupSession(
	userId: string,
	input: CredentialSetupDescribeInput,
): PendingCredentialSetupSession | undefined {
	return findCredentialSetupSessionEntry(userId, input)?.[1];
}

function findCredentialSetupSessionEntry(
	userId: string,
	input: CredentialSetupDescribeInput,
): PendingCredentialSetupSessionEntry | undefined {
	if (input.setupSessionId) {
		const session = findCredentialSetupSessionEntryById(userId, input.setupSessionId);
		if (session) return session;
	}

	const userSessionEntries = [...credentialSetupSessions.entries()].filter(
		([, session]) => session.userId === userId,
	);

	if (!input.credentialType) {
		return userSessionEntries.length === 1 ? userSessionEntries[0] : undefined;
	}

	const matchingSessions = userSessionEntries.filter(([, session]) =>
		matchesCredentialSetupInput(session.setupOutput, input),
	);

	return matchingSessions.at(-1);
}

function findCredentialSetupSessionEntryForCredential(
	userId: string,
	{
		setupSessionId,
		credentialType,
		credentialName,
		projectId,
	}: {
		setupSessionId: string | undefined;
		credentialType: string;
		credentialName: string | undefined;
		projectId?: string;
	},
): PendingCredentialSetupSessionEntry | undefined {
	if (setupSessionId) {
		const session = findCredentialSetupSessionEntryById(userId, setupSessionId);
		if (session) return session;
	}

	const matchingSessions = [...credentialSetupSessions.entries()].filter(
		([, session]) =>
			session.userId === userId &&
			session.setupOutput.credentialType === credentialType &&
			(projectId === undefined || session.setupOutput.projectId === projectId),
	);

	const matchingNameSessions = matchingSessions.filter(
		([, session]) =>
			credentialName !== undefined && session.setupOutput.credentialName === credentialName,
	);

	if (matchingNameSessions.length > 0) return matchingNameSessions.at(-1);

	return matchingSessions.length === 1 ? matchingSessions[0] : undefined;
}

function findCredentialSetupSessionEntryById(
	userId: string,
	setupSessionId: string,
): PendingCredentialSetupSessionEntry | undefined {
	const session = credentialSetupSessions.get(setupSessionId);
	if (session?.userId !== userId) return undefined;

	return [setupSessionId, session];
}

function matchesCredentialSetupInput(
	setupOutput: CredentialSetupOutput,
	input: CredentialSetupDescribeInput,
): boolean {
	return (
		setupOutput.credentialType === input.credentialType &&
		(input.projectId === undefined || setupOutput.projectId === input.projectId) &&
		(input.suggestedName === undefined || setupOutput.credentialName === input.suggestedName) &&
		(input.nodeType === undefined || setupOutput.nodeType === input.nodeType) &&
		(input.purpose === undefined || setupOutput.purpose === input.purpose)
	);
}

function getSafeResultFromToolResult(
	result: CallToolResult,
): CredentialSetupSafeResult | undefined {
	const structuredContent = result.structuredContent;
	if (!isRecord(structuredContent)) {
		return undefined;
	}

	return {
		credentialId:
			typeof structuredContent.credentialId === 'string'
				? structuredContent.credentialId
				: undefined,
		credentialName:
			typeof structuredContent.credentialName === 'string'
				? structuredContent.credentialName
				: undefined,
		credentialType:
			typeof structuredContent.credentialType === 'string'
				? structuredContent.credentialType
				: 'unknown',
		status:
			typeof structuredContent.status === 'string'
				? toCredentialSetupSafeStatus(structuredContent.status)
				: 'error',
		error: typeof structuredContent.error === 'string' ? structuredContent.error : undefined,
	};
}

function toCredentialSetupSafeStatus(status: string): CredentialSetupSafeResult['status'] {
	switch (status) {
		case 'setup_required':
		case 'created':
		case 'authorization_required':
		case 'pending':
		case 'connected':
		case 'tested':
		case 'deleted':
		case 'error':
			return status;
		default:
			return 'error';
	}
}

function toSetupSessionId(requestId: RequestId): string {
	if (requestId === undefined || requestId === null) {
		return randomUUID();
	}

	return String(requestId);
}

function toSafeErrorLabel(errorLabel: string, _error: unknown): string {
	return errorLabel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
