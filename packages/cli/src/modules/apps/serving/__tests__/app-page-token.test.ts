import jwt from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AppPageTokenService } from '../app-page-token';

const SECRET = 'hmac-secret';

describe('AppPageTokenService', () => {
	const service = new AppPageTokenService(mock<InstanceSettings>({ hmacSignatureSecret: SECRET }));

	it('round-trips the user of an n8n app', () => {
		const token = service.mint('app-1', 'user-1');

		expect(service.verify(token, 'app-1')).toEqual({ userId: 'user-1' });
	});

	it('round-trips without a user for a public app', () => {
		const token = service.mint('app-1');

		expect(service.verify(token, 'app-1')).toEqual({});
	});

	it('expires after 15 minutes', () => {
		const { exp, iat } = jwt.decode(service.mint('app-1')) as { exp: number; iat: number };

		expect(exp - iat).toBe(15 * 60);
	});

	it('rejects a token minted for another app', () => {
		const token = service.mint('app-2', 'user-1');

		expect(service.verify(token, 'app-1')).toBeNull();
	});

	it('rejects an expired token', () => {
		const token = jwt.sign({ sub: 'user-1' }, SECRET, {
			algorithm: 'HS256',
			audience: 'app:app-1',
			expiresIn: -1,
		});

		expect(service.verify(token, 'app-1')).toBeNull();
	});

	it('rejects a token signed with another secret', () => {
		const token = jwt.sign({ sub: 'user-1' }, 'other', {
			algorithm: 'HS256',
			audience: 'app:app-1',
			expiresIn: 60,
		});

		expect(service.verify(token, 'app-1')).toBeNull();
	});

	it('rejects a tampered token', () => {
		const [header, payload, signature] = service.mint('app-1', 'user-1').split('.');
		const forged = Buffer.from(JSON.stringify({ sub: 'user-2', aud: 'app:app-1' })).toString(
			'base64url',
		);

		expect(service.verify(`${header}.${forged}.${signature}`, 'app-1')).toBeNull();
		expect(service.verify(`${header}.${payload}.`, 'app-1')).toBeNull();
		expect(service.verify('not-a-token', 'app-1')).toBeNull();
	});
});
