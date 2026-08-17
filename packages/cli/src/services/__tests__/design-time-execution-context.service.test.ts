import type { Request } from 'express';
import type { ExecutionContextService } from 'n8n-core';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { DesignTimeExecutionContextService } from '@/services/design-time-execution-context.service';

describe('DesignTimeExecutionContextService', () => {
	let authService: Mocked<AuthService>;
	let executionContextService: Mocked<ExecutionContextService>;
	let service: DesignTimeExecutionContextService;

	const req = mock<Request>();

	beforeEach(() => {
		authService = mock<AuthService>();
		executionContextService = mock<ExecutionContextService>();
		service = new DesignTimeExecutionContextService(authService, executionContextService);
	});

	it("seals the request's own auth cookie and request context", async () => {
		authService.getCookieToken.mockReturnValue('n8n-auth-cookie-jwt');
		authService.getMethod.mockReturnValue('POST');
		authService.getEndpoint.mockReturnValue('/rest/dynamic-node-parameters/options');
		authService.getBrowserId.mockReturnValue('browser-abc');
		executionContextService.buildRequestBoundCredentials.mockResolvedValue('sealed');

		const context = await service.buildFor(req);

		expect(executionContextService.buildRequestBoundCredentials).toHaveBeenCalledWith(
			'n8n-auth-cookie-jwt',
			{
				method: 'POST',
				endpoint: '/rest/dynamic-node-parameters/options',
				browserId: 'browser-abc',
			},
		);
		expect(context).toEqual({
			version: 1,
			establishedAt: expect.any(Number),
			source: 'internal',
			credentials: 'sealed',
		});
	});

	it('returns no context for a caller without an auth cookie', async () => {
		// API-key callers keep the existing static-data behaviour rather than failing.
		authService.getCookieToken.mockReturnValue(undefined);

		expect(await service.buildFor(req)).toBeUndefined();
		expect(executionContextService.buildRequestBoundCredentials).not.toHaveBeenCalled();
	});
});
