import type { Logger } from '@n8n/backend-common';
import type { Principal, SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { logAuthenticationOutcome } from '../authentication-outcome';

const RESOURCE = 'https://n8n.example/form/abc';

const context: SecurityContext = {
	subject: { id: 'user-1', type: 'human', email: 'alice@example.com' } as Principal,
	authMethod: 'oauth-access-token',
	subjectClaim: { sourceId: 'source-1', issuer: 'https://idp.example', subject: 'idp-alice' },
	tokenScopes: ['form:submit'],
};

describe('logAuthenticationOutcome', () => {
	const logger = mock<Logger>();

	beforeEach(() => vi.clearAllMocks());

	it('writes one info line with surface, source, method and user when the caller is allowed', () => {
		logAuthenticationOutcome(logger, { surface: 'trigger', resource: RESOURCE, context });

		expect(logger.info).toHaveBeenCalledTimes(1);
		expect(logger.info).toHaveBeenCalledWith('Inbound authentication allowed', {
			surface: 'trigger',
			resource: RESOURCE,
			sourceId: 'source-1',
			authMethod: 'oauth-access-token',
			userId: 'user-1',
		});
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('writes one warn line with the reason when the caller is denied', () => {
		logAuthenticationOutcome(logger, {
			surface: 'trigger',
			resource: RESOURCE,
			context,
			reason: 'insufficient_scope',
		});

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith('Inbound authentication denied', {
			surface: 'trigger',
			resource: RESOURCE,
			sourceId: 'source-1',
			authMethod: 'oauth-access-token',
			userId: 'user-1',
			reason: 'insufficient_scope',
		});
		expect(logger.info).not.toHaveBeenCalled();
	});

	it('logs a denial without a context when nothing was authenticated', () => {
		logAuthenticationOutcome(logger, {
			surface: 'trigger',
			resource: RESOURCE,
			reason: 'no-credential',
		});

		expect(logger.warn).toHaveBeenCalledWith('Inbound authentication denied', {
			surface: 'trigger',
			resource: RESOURCE,
			sourceId: undefined,
			authMethod: undefined,
			userId: undefined,
			reason: 'no-credential',
		});
	});

	it('never logs the external subject or the email', () => {
		logAuthenticationOutcome(logger, { surface: 'trigger', resource: RESOURCE, context });

		const serialized = JSON.stringify(logger.info.mock.calls);
		expect(serialized).not.toContain('idp-alice');
		expect(serialized).not.toContain('alice@example.com');
	});
});
