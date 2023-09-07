import config from '@/config';
import { JwtService } from '@/services/jwt.service';
import { randomString } from '../../integration/shared/random';
import * as jwt from 'jsonwebtoken';

describe('JwtService', () => {
	config.set('userManagement.jwtSecret', randomString(5, 10));

	const jwtService = new JwtService();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('Should sign input with user management secret', async () => {
		const userId = 1;

		const token = jwtService.signData({ sub: userId });
		expect(typeof token).toBe('string');

		const secret = config.get('userManagement.jwtSecret');

		const decodedToken = jwt.verify(token, secret);

		expect(decodedToken).toHaveProperty('sub');
		expect(decodedToken).toHaveProperty('iat');
		expect(decodedToken?.sub).toBe(userId);
	});

	test('Should verify token with user management secret', async () => {
		const userId = 1;

		const secret = config.get('userManagement.jwtSecret');

		const token = jwt.sign({ sub: userId }, secret);

		const decodedToken = jwt.verify(token, secret);

		expect(decodedToken).toHaveProperty('sub');
		expect(decodedToken?.sub).toBe(userId);
	});
});
