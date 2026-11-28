import { mock } from 'vitest-mock-extended';

import type { McpServerAdapters } from '../../ports/mcp-server-adapters';
import type { OAuthClientNamePort } from '../../ports/oauth-client-name.port';
import type { RefreshTokenPort } from '../../ports/refresh-token.port';
import type { TextDraftPort } from '../../ports/text-draft.port';
import type { WorkflowToolPort } from '../../ports/workflow-tool.port';

/** One mock for each port, in the shape that `McpServerAdapters.resolve()` returns. */
export function mockMcpServerPorts() {
	return {
		workflows: mock<WorkflowToolPort>(),
		textDrafts: mock<TextDraftPort>(),
		clients: mock<OAuthClientNamePort>(),
		refreshTokens: mock<RefreshTokenPort>(),
	} satisfies ReturnType<McpServerAdapters['resolve']>;
}
