import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { safeJoinPath } from '@n8n/backend-common';
import type {
	InstanceAiPermissionMode,
	InstanceGatewayResourceDecision,
	McpTool,
	McpToolCallResult,
} from '@n8n/api-types';
import {
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	mcpToolCallResultSchema,
	mcpToolSchema,
} from '@n8n/api-types';
import type { UserRepository } from '@n8n/db';
import type { DomainAccessTracker } from '@n8n/instance-ai';
import type {
	AffectedResource,
	CreateCredentialPayload,
	SecretsBuffer,
	ToolContext,
	ToolDefinition,
} from '@n8n/mcp-browser';
import { UnexpectedError } from 'n8n-workflow';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import type { CredentialsService } from '@/credentials/credentials.service';

export interface BrowserDomainGate {
	tracker: DomainAccessTracker;
	runId: string;
	/** Governs domain access — every browser tool whose affected resource is a host. */
	permissionMode?: InstanceAiPermissionMode;
	/**
	 * Governs `browser_create_credential`, which reports `credentials` rather than a host.
	 * Writing a credential to the instance is a different kind of action from reading a
	 * page, so it carries its own permission.
	 */
	createCredentialPermissionMode?: InstanceAiPermissionMode;
}

/** Converts a browser tool to an MCP tool, or returns `undefined` when its input schema has no MCP form. */
export function toBrowserMcpTool(tool: ToolDefinition): McpTool | undefined {
	const parsed = mcpToolSchema.safeParse({
		name: tool.name,
		description: tool.description,
		inputSchema: zodSchemaToJsonSchema(tool.inputSchema),
		annotations: { category: 'browser' },
	});
	return parsed.success ? parsed.data : undefined;
}

/**
 * Parses the arguments, runs the tool and returns its result in the MCP shape.
 * `checkAccess` runs after parsing. A result from it is returned instead of running the tool.
 */
export async function executeBrowserTool(
	tool: ToolDefinition,
	rawArgs: Record<string, unknown>,
	toolContext: ToolContext,
	checkAccess?: (args: unknown) => Promise<McpToolCallResult | undefined>,
): Promise<McpToolCallResult> {
	try {
		const args: unknown = tool.inputSchema.parse(rawArgs);

		const accessResult = await checkAccess?.(args);
		if (accessResult) {
			return accessResult;
		}

		const result = await tool.execute(args, toolContext);
		const parsed = mcpToolCallResultSchema.safeParse(result);
		if (parsed.success) {
			return parsed.data;
		}

		return {
			content: [{ type: 'text', text: JSON.stringify(result.content) }],
			...(result.isError === true ? { isError: true } : {}),
		};
	} catch (error) {
		return browserErrorResult(error instanceof Error ? error.message : String(error));
	}
}

export function browserErrorResult(message: string): McpToolCallResult {
	return { content: [{ type: 'text', text: message }], isError: true };
}

/** Holds secrets captured from a page until a credential is created from them. They never reach the model. */
export function createInMemorySecretsBuffer(): SecretsBuffer {
	const store = new Map<string, Map<string, string>>();
	return {
		capture(credentialsKey: string, field: string, value: string): void {
			const fields = store.get(credentialsKey) ?? new Map<string, string>();
			fields.set(field, value);
			store.set(credentialsKey, fields);
		},
		getFields(credentialsKey: string): Map<string, string> | undefined {
			return store.get(credentialsKey);
		},
		clear(credentialsKey: string): void {
			store.delete(credentialsKey);
		},
	};
}

/** Saves a credential that the browser tools assembled from captured secrets, as the given user. */
export async function createBrowserCredential(
	userRepository: UserRepository,
	credentialsService: CredentialsService,
	userId: string,
	payload: CreateCredentialPayload,
): Promise<{ credentialId: string }> {
	const user = await userRepository.findOne({
		where: { id: userId },
		relations: ['role'],
	});
	if (!user) {
		throw new UnexpectedError('User for browser session not found');
	}

	const credential = await credentialsService.createUnmanagedCredential(payload, user);
	return { credentialId: credential.id };
}

/**
 * Creates a working folder for one user's browser tools under the system temp folder,
 * so files from different users never mix. Each kind of browser uses its own `folderName`.
 */
export async function createBrowserWorkDir(folderName: string, userId: string): Promise<string> {
	// Each part must stay inside its parent, so a value with `..` cannot leave the temp folder.
	const workDir = safeJoinPath(safeJoinPath(tmpdir(), folderName), userId);
	await mkdir(workDir, { recursive: true });
	return workDir;
}

/**
 * Checks one site or credential write against the gate. Returns a result that stops the
 * call (a denial, or a request for the user to confirm), or `undefined` when the call can
 * run. `confirmation` is the user's answer when the call runs again after a request.
 */
export async function gateBrowserAccess(
	gate: BrowserDomainGate,
	affected: AffectedResource,
	confirmation: unknown,
): Promise<McpToolCallResult | undefined> {
	return affected.kind === 'credential-write'
		? gateCredentialCreation(gate, affected, confirmation)
		: await gateDomainAccess(gate, affected, confirmation);
}

/** Whether the gate lets a call touch the resource without asking the user. */
export function isBrowserAccessAllowed(
	gate: BrowserDomainGate,
	affected: AffectedResource,
): boolean {
	if (affected.kind === 'credential-write') {
		return gate.createCredentialPermissionMode === 'always_allow';
	}
	return (
		gate.permissionMode === 'always_allow' ||
		(gate.permissionMode !== 'blocked' && gate.tracker.isHostAllowed(affected.resource, gate.runId))
	);
}

async function gateDomainAccess(
	gate: BrowserDomainGate,
	affected: AffectedResource,
	confirmation: unknown,
): Promise<McpToolCallResult | undefined> {
	const host = affected.resource;

	// Checked before the user's answer, so a block set while a request waits still applies.
	if (gate.permissionMode === 'blocked') {
		return browserErrorResult('Browser access blocked by admin');
	}

	if (typeof confirmation === 'string') {
		switch (confirmation) {
			case 'allowForSession':
				await gate.tracker.approveDomain(host);
				return undefined;
			case 'allowOnce':
				gate.tracker.approveOnce(gate.runId, host);
				return undefined;
			default:
				return browserErrorResult('Access denied by user');
		}
	}

	if (gate.permissionMode !== 'always_allow' && !gate.tracker.isHostAllowed(host, gate.runId)) {
		return confirmationRequiredResult(affected, ['denyOnce', 'allowOnce', 'allowForSession']);
	}
	return undefined;
}

/**
 * Credential creation is confirmed per call against its own permission: there is no
 * session-wide option, and the domain tracker plays no part in the decision.
 */
function gateCredentialCreation(
	gate: BrowserDomainGate,
	affected: AffectedResource,
	confirmation: unknown,
): McpToolCallResult | undefined {
	// Checked before the user's answer, so a block set while a request waits still applies.
	if (gate.createCredentialPermissionMode === 'blocked') {
		return browserErrorResult('Credential creation blocked by admin');
	}

	if (typeof confirmation === 'string') {
		return confirmation === 'allowOnce' ? undefined : browserErrorResult('Access denied by user');
	}

	if (gate.createCredentialPermissionMode !== 'always_allow') {
		return confirmationRequiredResult(affected, ['denyOnce', 'allowOnce']);
	}
	return undefined;
}

function confirmationRequiredResult(
	affected: AffectedResource,
	options: InstanceGatewayResourceDecision[],
): McpToolCallResult {
	const payload = {
		toolGroup: affected.toolGroup,
		resource: affected.resource,
		description: affected.description,
		options,
	};
	return {
		content: [
			{ type: 'text', text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(payload)}` },
		],
		isError: true,
	};
}
