import { Service } from '@n8n/di';

import { JwtService } from '@/services/jwt.service';

interface ChatTokenPayload {
	executionId: string;
	type: 'chat';
}

/**
 * Service for generating and validating signed tokens for chat WebSocket connections.
 * Uses JWT to create stateless tokens that can be validated by any n8n instance.
 * This prevents attackers from hijacking chat sessions by guessing executionIds,
 * and works correctly in multi-main setups since no shared state is needed.
 */
@Service()
export class ChatTokenService {
	private static readonly TOKEN_EXPIRY = '5m';

	constructor(private readonly jwtService: JwtService) {}

	/**
	 * Generate a signed token for a chat execution.
	 * The token is self-contained and can be validated by any n8n instance
	 * sharing the same encryption key.
	 */
	generateToken(executionId: string): string {
		return this.jwtService.sign({ executionId, type: 'chat' } satisfies ChatTokenPayload, {
			expiresIn: ChatTokenService.TOKEN_EXPIRY,
		});
	}

	/**
	 * Validate the token and verify it matches the expected executionId.
	 * Returns true if the token is valid and was issued for this executionId.
	 */
	validateToken(executionId: string, token: string): boolean {
		try {
			const payload = this.jwtService.verify<ChatTokenPayload>(token, {
				algorithms: ['HS256'],
			});
			return payload.type === 'chat' && payload.executionId === executionId;
		} catch {
			return false;
		}
	}
}
