import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { ExecutionContextService } from 'n8n-core';
import { z } from 'zod';

import { JwtService } from '@/services/jwt.service';

/** Discriminator placed on the credential context of a run started over the instance MCP server. */
export const MCP_EXECUTION_SOURCE = 'mcp-execution';

/**
 * `kind` is not decoration: the runner token is signed with the same secret as the
 * session cookie, so the payload has to say which of the two it is. Session payloads
 * carry `id`/`hash` and never `kind`, so neither shape can be replayed as the other.
 */
const McpRunnerTokenPayloadSchema = z.object({
	kind: z.literal(MCP_EXECUTION_SOURCE),
	userId: z.string(),
});

export type McpRunnerTokenPayload = z.infer<typeof McpRunnerTokenPayloadSchema>;

/**
 * Mints and verifies the token that lets a run started over the instance MCP server
 * act for the user who called it.
 *
 * The other credential-context sources forward a token a live caller handed them.
 * An MCP call is authenticated too, but with an API key or a resource-scoped OAuth
 * token, so there is nothing to forward: we mint a token naming the user instead.
 * Signing keeps the claim tamper-evident and the expiry bounds how long a leaked
 * context stays usable; `N8NIdentifier` answers the separate question of whether
 * that user may still be acted for.
 */
@Service()
export class McpExecutionIdentityService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly executionContextService: ExecutionContextService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Matches the session a browser-triggered manual run would have carried, so an
	 * MCP run resolves credentials for as long as an editor run of the same workflow
	 * would — including one parked on a Wait node.
	 */
	private get tokenTtlSeconds(): number {
		return this.globalConfig.userManagement.jwtSessionDurationHours * Time.hours.toSeconds;
	}

	/** Returns the encrypted credential context to put on `encryptedRunnerIdentity`. */
	async mintCredentialContext(userId: string): Promise<string> {
		const token = this.jwtService.sign(
			{ kind: MCP_EXECUTION_SOURCE, userId } satisfies McpRunnerTokenPayload,
			{ expiresIn: this.tokenTtlSeconds },
		);

		return await this.executionContextService.buildMcpExecutionCredentials(token);
	}

	/**
	 * Verifies signature and expiry, then the payload shape.
	 *
	 * @throws When the token is unsigned by this instance, expired, or not a runner token.
	 */
	verifyToken(token: string): McpRunnerTokenPayload {
		return McpRunnerTokenPayloadSchema.parse(this.jwtService.verify(token));
	}
}
