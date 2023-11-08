import Container from 'typedi';
import jwt from 'jsonwebtoken';
import { Logger } from '@/Logger';
import config from '@/config';
import { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories';
import { UserService } from '@/services/user.service';
import { mockInstance } from '../../integration/shared/utils';

describe('UserService', () => {
	config.set('userManagement.jwtSecret', 'random-secret');

	mockInstance(Logger);
	const repository = mockInstance(UserRepository);
	const service = Container.get(UserService);
	const testUser = Object.assign(new User(), {
		id: '1234',
		password: 'passwordHash',
		mfaEnabled: false,
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('generatePasswordResetToken', () => {
		it('should generate valid password-reset tokens', () => {
			const token = service.generatePasswordResetToken(testUser);
			const decoded = jwt.decode(token) as jwt.JwtPayload;
			expect(decoded.sub).toEqual(testUser.id);
			expect(decoded.exp! - decoded.iat!).toEqual(1200); // Expires in 20 minutes
			expect(decoded.passwordSha).toEqual(
				'31513c5a9e3c5afe5c06d5675ace74e8bc3fadd9744ab5d89c311f2a62ccbd39',
			);
		});
	});

	describe('resolvePasswordResetToken', () => {
		it('should not return a user if the token in invalid', async () => {
			const user = await service.resolvePasswordResetToken('invalid-token');
			expect(user).toBeUndefined();
		});

		it('should not return a user if the token in expired', async () => {
			const token = service.generatePasswordResetToken(testUser, '-1h');
			const user = await service.resolvePasswordResetToken(token);
			expect(user).toBeUndefined();
		});

		it('should not return a user if the user does not exist in the DB', async () => {
			repository.findOne.mockResolvedValueOnce(null);
			const token = service.generatePasswordResetToken(testUser);
			const user = await service.resolvePasswordResetToken(token);
			expect(user).toBeUndefined();
		});

		it('should not return a user if the password sha does not match', async () => {
			const token = service.generatePasswordResetToken(testUser);
			const updatedUser = Object.create(testUser);
			updatedUser.password = 'something-else';
			repository.findOne.mockResolvedValueOnce(updatedUser);
			const user = await service.resolvePasswordResetToken(token);
			expect(user).toBeUndefined();
		});

		it('should not return the user if all checks pass', async () => {
			const token = service.generatePasswordResetToken(testUser);
			repository.findOne.mockResolvedValueOnce(testUser);
			const user = await service.resolvePasswordResetToken(token);
			expect(user).toEqual(testUser);
		});
	});
});
