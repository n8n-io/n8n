import type { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import {
	Cipher,
	CipherAes256CBC,
	CipherAes256GCM,
	EncryptionKeyProxy,
	ExecutionContextService,
} from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { JwtService } from '@/services/jwt.service';

import {
	RUNNER_TOKEN_TTL_SECONDS,
	ScheduledTriggerIdentityService,
} from '../scheduled-trigger-identity';

describe('ScheduledTriggerIdentityService', () => {
	const encryptionKey = 'test-encryption-key-that-is-long-enough';

	let service: ScheduledTriggerIdentityService;
	let jwtService: JwtService;
	let executionContextService: ExecutionContextService;

	beforeEach(() => {
		const instanceSettings = mock<InstanceSettings>({ encryptionKey });
		// Real signing and real encryption: a round-trip through mocks would prove nothing.
		jwtService = new JwtService(
			instanceSettings,
			mock<GlobalConfig>({ userManagement: { jwtSecret: '' } }),
		);
		const cipher = new Cipher(
			instanceSettings,
			new CipherAes256GCM(),
			new CipherAes256CBC(),
			new EncryptionKeyProxy(),
		);
		executionContextService = new ExecutionContextService(mock(), mock(), cipher);

		service = new ScheduledTriggerIdentityService(jwtService, executionContextService);
	});

	it('should round-trip the user and workflow through an encrypted context', async () => {
		const encrypted = await service.mintCredentialContext('user-1', 'workflow-1');

		const context = await executionContextService.decryptCredentialContext(encrypted);

		expect(context.metadata).toEqual({ source: 'scheduled-trigger' });
		expect(service.verifyToken(context.identity)).toMatchObject({
			userId: 'user-1',
			workflowId: 'workflow-1',
		});
	});

	it('should reject a token signed with a different secret', () => {
		const foreign = new JwtService(
			mock<InstanceSettings>({ encryptionKey: 'a-completely-different-key-value' }),
			mock<GlobalConfig>({ userManagement: { jwtSecret: '' } }),
		);
		const token = foreign.sign({ userId: 'user-1', workflowId: 'workflow-1' });

		expect(() => service.verifyToken(token)).toThrow();
	});

	it('should reject a token past its expiry', () => {
		const token = jwtService.sign(
			{ userId: 'user-1', workflowId: 'workflow-1' },
			{ expiresIn: -1 },
		);

		expect(() => service.verifyToken(token)).toThrow();
	});

	it('should reject a validly signed token that is missing the workflow', () => {
		const token = jwtService.sign({ userId: 'user-1' });

		expect(() => service.verifyToken(token)).toThrow();
	});

	it('should mint tokens that outlive the scheduler lease and misfire grace', () => {
		// Both default to 60s; a token shorter than a redelivery window would
		// resolve on the first dispatch and fail on the retry.
		expect(RUNNER_TOKEN_TTL_SECONDS).toBeGreaterThan(120);
	});
});
