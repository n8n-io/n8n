import { Service } from '@n8n/di';
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Service for generating and validating cryptographic tokens for chat WebSocket connections.
 * This prevents attackers from hijacking chat sessions by guessing executionIds.
 */
@Service()
export class ChatTokenService {
	private readonly tokens = new Map<string, string>();

	/**
	 * Generate a cryptographically secure token for a chat execution.
	 * The token is stored in memory and associated with the executionId.
	 */
	generateToken(executionId: string): string {
		const token = randomBytes(32).toString('hex');
		this.tokens.set(executionId, token);
		return token;
	}

	/**
	 * Validate that the provided token matches the one stored for the executionId.
	 * Uses timing-safe comparison to prevent timing attacks.
	 */
	validateToken(executionId: string, token: string): boolean {
		const storedToken = this.tokens.get(executionId);
		if (!storedToken) return false;

		// Use timing-safe comparison to prevent timing attacks
		const tokenBuffer = Buffer.from(token);
		const storedBuffer = Buffer.from(storedToken);
		if (tokenBuffer.length !== storedBuffer.length) return false;

		return timingSafeEqual(tokenBuffer, storedBuffer);
	}

	/**
	 * Remove the token for an execution (called when execution completes or times out).
	 */
	removeToken(executionId: string): void {
		this.tokens.delete(executionId);
	}
}
