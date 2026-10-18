import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { McpTool, McpToolCallResult } from '@n8n/api-types';
import { mcpToolCallResultSchema, mcpToolSchema } from '@n8n/api-types';
import type { UserRepository } from '@n8n/db';
import type {
	CreateCredentialPayload,
	SecretsBuffer,
	ToolContext,
	ToolDefinition,
} from '@n8n/mcp-browser';
import { UnexpectedError } from 'n8n-workflow';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CredentialsService } from '@/credentials/credentials.service';

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
	const workDir = join(tmpdir(), folderName, userId);
	await mkdir(workDir, { recursive: true });
	return workDir;
}
