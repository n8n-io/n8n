import { mock } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';

import config from '@/config';
import { JwtService } from '@/services/jwt.service';

describe('JwtService', () => {
	const iat = 1699984313;
	const jwtSecret = 'random-string';
	const payload = { sub: 1 };
	const signedToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTY5OTk4NDMxM30.xNZOAmcidW5ovEF_mwIOzCWkJ70FEO6MFNLK2QRDOeQ';

	const instanceSettings = mock<InstanceSettings>({ signingSecret: 'test-key' });

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('secret initialization', () => {
		it('should read the secret from config, when set', () => {
			config.set('userManagement.jwtSecret', jwtSecret);
			const jwtService = new JwtService(instanceSettings);
			expect(jwtService.jwtSecret).toEqual(jwtSecret);
		});

		it('should derive the secret from encryption key when not set in config', () => {
			config.set('userManagement.jwtSecret', '');
			const jwtService = new JwtService(instanceSettings);
			expect(jwtService.jwtSecret).toEqual(
				'62af8704764faf8ea82fc61ce9c4c3908b6cb97d463a634e9e587d7c885db0ef',
			);
		});
	});

	describe('with a secret set', () => {
		config.set('userManagement.jwtSecret', jwtSecret);
		const jwtService = new JwtService(instanceSettings);

		beforeAll(() => {
			jest.useFakeTimers().setSystemTime(new Date(iat * 1000));
		});

		afterAll(() => jest.useRealTimers());

		it('should sign', () => {
			const token = jwtService.sign(payload);
			expect(token).toEqual(signedToken);
		});

		it('should decode and verify payload', () => {
			const decodedToken = jwtService.verify(signedToken);
			expect(decodedToken.sub).toEqual(1);
			expect(decodedToken.iat).toEqual(iat);
		});

		it('should throw an error on verify if the token is expired', () => {
			const expiredToken = jwt.sign(payload, jwtSecret, { expiresIn: -10 });
			expect(() => jwtService.verify(expiredToken)).toThrow(jwt.TokenExpiredError);
		});
	});
});
