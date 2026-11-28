import type { OAuthClientNamePort } from './oauth-client-name.port';
import type { RefreshTokenPort } from './refresh-token.port';
import type { TextDraftPort } from './text-draft.port';
import type { WorkflowToolPort } from './workflow-tool.port';

/**
 * The CLI registers this resolver when it loads the module. The module calls it
 * in `init()`, because the adapters need the database connection, which does not
 * exist yet at load time.
 */
export abstract class McpServerAdapters {
	abstract resolve(): {
		workflows: WorkflowToolPort;
		textDrafts: TextDraftPort;
		clients: OAuthClientNamePort;
		refreshTokens: RefreshTokenPort;
	};
}
