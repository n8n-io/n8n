import jwt from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AppPageTokenService } from '../app-page-token';

const SECRET = 'hmac-secret';

describe('AppPageTokenService', () => {
	const service = new AppPageTokenService(mock<InstanceSettings>({ hmacSignatureSecret: SECRET }));

	it('verifies a token it minted for the same app', () => {
		expect(service.verify(service.mint('app-1'), 'app-1')).toBe(true);
	});

	it('expires after 15 minutes', () => {
		const { exp, iat } = jwt.decode(service.mint('app-1')) as { exp: number; iat: number };

		expect(exp - iat).toBe(15 * 60);
	});

	it('rejects a token minted for another app', () => {
		expect(service.verify(service.mint('app-2'), 'app-1')).toBe(false);
	});

	it('rejects an expired token', () => {
		const token = jwt.sign({}, SECRET, {
			algorithm: 'HS256',
			audience: 'app:app-1',
			expiresIn: -1,
		});

		expect(service.verify(token, 'app-1')).toBe(false);
	});

	it('rejects a token signed with another secret', () => {
		const token = jwt.sign({}, 'other', {
			algorithm: 'HS256',
			audience: 'app:app-1',
			expiresIn: 60,
		});

		expect(service.verify(token, 'app-1')).toBe(false);
	});

	it('rejects a tampered token', () => {
		const [header, payload, signature] = service.mint('app-1').split('.');
		const forged = Buffer.from(JSON.stringify({ aud: 'app:app-2' })).toString('base64url');

		expect(service.verify(`${header}.${forged}.${signature}`, 'app-2')).toBe(false);
		expect(service.verify(`${header}.${payload}.`, 'app-1')).toBe(false);
		expect(service.verify('not-a-token', 'app-1')).toBe(false);
	});
});
