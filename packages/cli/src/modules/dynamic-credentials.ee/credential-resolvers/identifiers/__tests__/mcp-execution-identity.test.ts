import type { GlobalConfig } from '@n8n/config';
import type { ExecutionContextService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { JwtService } from '@/services/jwt.service';

import { McpExecutionIdentityService } from '../mcp-execution-identity';

describe('McpExecutionIdentityService', () => {
	const jwtService = mock<JwtService>();
	const executionContextService = mock<ExecutionContextService>();
	const globalConfig = mock<GlobalConfig>({
		userManagement: { jwtSessionDurationHours: 168 },
	});

	const service = new McpExecutionIdentityService(
		jwtService,
		executionContextService,
		globalConfig,
	);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('mintCredentialContext', () => {
		it('should seal a token naming the user, expiring with the session it stands in for', async () => {
			jwtService.sign.mockReturnValue('signed-token');
			executionContextService.buildMcpExecutionCredentials.mockResolvedValue('encrypted-context');

			const result = await service.mintCredentialContext('user-123');

			expect(result).toBe('encrypted-context');
			expect(jwtService.sign).toHaveBeenCalledWith(
				{ kind: 'mcp-execution', userId: 'user-123' },
				{ expiresIn: 168 * 3600 },
			);
			expect(executionContextService.buildMcpExecutionCredentials).toHaveBeenCalledWith(
				'signed-token',
			);
		});
	});

	describe('verifyToken', () => {
		it('should return the payload of a token this instance signed', () => {
			jwtService.verify.mockReturnValue({ kind: 'mcp-execution', userId: 'user-123' });

			expect(service.verifyToken('signed-token')).toEqual({
				kind: 'mcp-execution',
				userId: 'user-123',
			});
		});

		it('should reject a session cookie replayed as a runner token', () => {
			// Both are signed with the same secret, so only the payload shape tells them apart.
			jwtService.verify.mockReturnValue({ id: 'user-123', hash: 'abc' });

			expect(() => service.verifyToken('session-cookie')).toThrow();
		});

		it('should propagate a verification failure', () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('jwt expired');
			});

			expect(() => service.verifyToken('expired-token')).toThrow('jwt expired');
		});
	});
});
