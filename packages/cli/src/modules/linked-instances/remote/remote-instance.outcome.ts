import { truncate } from '@n8n/utils/string/truncate';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { RemoteInstanceError } from './remote-instance.errors';
import { getLoadedSdk, type McpSdk } from './remote-instance.sdk';

/** The part of a request that failed: setting up the connection, listing tools or calling one. */
export type RemoteStep = 'connect' | 'list' | 'call';

const MAX_TOOL_ERROR_LENGTH = 500;

const textBlockSchema = z.object({ type: z.literal('text'), text: z.string() });

const toolResultSchema = z.object({
	content: z.array(z.unknown()).optional(),
	structuredContent: z.record(z.unknown()).optional(),
	isError: z.boolean().optional(),
});

export function fromHttpStatus(status: number | undefined): RemoteInstanceError {
	if (status === 401 || status === 403) return new RemoteInstanceError('unauthorised');
	if (status === 404) return new RemoteInstanceError('mcp-disabled');
	return new RemoteInstanceError('unreachable');
}

/** Removes the token and cuts the text, so remote text is safe to show and log. */
export function remoteText(text: string, token: string): string | undefined {
	if (text.trim() === '') return undefined;
	return truncate(text.split(token).join('[REDACTED]'), MAX_TOOL_ERROR_LENGTH);
}

function fromMcpError(
	error: InstanceType<McpSdk['McpError']>,
	step: RemoteStep,
	{ sdk, token }: { sdk: McpSdk; token: string },
): RemoteInstanceError {
	// No tool call goes out before the connection is ready, and a closed connection is not an
	// answer from the tool.
	if (step === 'connect' || error.code === sdk.connectionClosedCode) {
		return new RemoteInstanceError('unreachable');
	}
	if (error.code === sdk.requestTimeoutCode) return new RemoteInstanceError('timeout');
	if (step === 'list') return new RemoteInstanceError('unreachable');
	return new RemoteInstanceError('tool-error', remoteText(error.message, token));
}

/**
 * Only an error that the remote returns for a tool call is `tool-error`.
 * Never sets `cause`: SDK errors can hold raw response text.
 */
export function toRemoteError(
	error: unknown,
	step: RemoteStep,
	token: string,
): RemoteInstanceError {
	if (error instanceof RemoteInstanceError) return error;
	const sdk = getLoadedSdk();
	if (!sdk) return new RemoteInstanceError('unreachable');
	if (error instanceof sdk.StreamableHTTPError) return fromHttpStatus(error.code);
	if (error instanceof sdk.McpError) return fromMcpError(error, step, { sdk, token });
	return new RemoteInstanceError('unreachable');
}

/** Returns `structuredContent`, else the text content parsed as JSON, else the text. */
export function readToolResult(raw: unknown, token: string): unknown {
	const parsed = toolResultSchema.safeParse(raw);
	if (!parsed.success) {
		throw new RemoteInstanceError(
			'tool-error',
			'The linked instance sent a tool result in an unknown format.',
		);
	}
	const { content = [], structuredContent, isError } = parsed.data;
	const text = content
		.flatMap((block) => {
			const textBlock = textBlockSchema.safeParse(block);
			return textBlock.success ? [textBlock.data.text] : [];
		})
		.join('\n');
	if (isError === true) throw new RemoteInstanceError('tool-error', remoteText(text, token));
	if (structuredContent !== undefined) return structuredContent;
	return jsonParse<unknown>(text, { fallbackValue: text });
}
