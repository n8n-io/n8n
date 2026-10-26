import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { UserCalledMCPToolEventPayload } from '../mcp.types';

export function trackAndReturnToolError(
	telemetry: Telemetry,
	telemetryPayload: UserCalledMCPToolEventPayload,
	error: unknown,
	formatOutput: (message: string) => Record<string, unknown> = (message) => ({ error: message }),
) {
	const errorMessage = getErrorMessage(error);
	telemetryPayload.results = { success: false, error: errorMessage };
	telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

	const output = formatOutput(errorMessage);
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(output) }],
		structuredContent: output,
		isError: true,
	};
}

export function trackAndRethrowToolError(
	telemetry: Telemetry,
	telemetryPayload: UserCalledMCPToolEventPayload,
	error: unknown,
): never {
	telemetryPayload.results = {
		success: false,
		error: getErrorMessage(error),
	};
	telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
	throw error;
}
