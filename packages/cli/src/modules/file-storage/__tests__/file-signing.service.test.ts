import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { FileSigningService } from '../file-signing.service';

const ENCRYPTION_KEY = 'test-encryption-key';
const TTL_MS = 15 * 60 * 1000;

/** The service's derived secret, recomputed for crafting rogue tokens. */
const projectFilesSecret = createHash('sha256')
	.update(`url-signing:project-files:${ENCRYPTION_KEY}`)
	.digest('base64');

/** The binary-data derivation (`binary-data.config.ts`) — distinct salt. */
const binaryDataSecret = createHash('sha256')
	.update(`url-signing:${ENCRYPTION_KEY}`)
	.digest('base64');

describe('FileSigningService', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		fileStorage: { signedUrlTtlMs: TTL_MS },
	});
	const instanceSettings = mock<InstanceSettings>({ encryptionKey: ENCRYPTION_KEY });

	let service: FileSigningService;

	beforeEach(() => {
		vi.useFakeTimers({ now: new Date('2026-08-12T12:00:00.000Z') });
		service = new FileSigningService(instanceSettings, globalConfig);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should roundtrip a token back to its fileId', () => {
		const token = service.createSignedToken('file-123');

		expect(service.validateSignedToken(token)).toBe('file-123');
	});

	it('should sign with the configured TTL', () => {
		const token = service.createSignedToken('file-123');

		const payload = jwt.decode(token);
		if (payload === null || typeof payload === 'string') throw new Error('expected a payload');
		expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(TTL_MS / 1000);
	});

	it('should reject an expired token', () => {
		const token = service.createSignedToken('file-123');

		vi.advanceTimersByTime(TTL_MS + 1000);

		expect(() => service.validateSignedToken(token)).toThrow(TokenExpiredError);
	});

	it('should reject a token with the wrong scope, even when correctly signed', () => {
		const token = jwt.sign({ fileId: 'file-123', scope: 'other-scope' }, projectFilesSecret);

		expect(() => service.validateSignedToken(token)).toThrow(JsonWebTokenError);
	});

	it('should reject a correctly-signed token without a fileId', () => {
		const token = jwt.sign({ scope: 'project-file' }, projectFilesSecret);

		expect(() => service.validateSignedToken(token)).toThrow(JsonWebTokenError);
	});

	it('should reject a binary-data signed token — the secrets are never interchangeable', () => {
		const token = jwt.sign({ id: 'filesystem-v2:some-binary-id' }, binaryDataSecret);

		expect(() => service.validateSignedToken(token)).toThrow(JsonWebTokenError);
	});

	it('should reject garbage tokens', () => {
		expect(() => service.validateSignedToken('not-a-jwt')).toThrow(JsonWebTokenError);
	});
});
