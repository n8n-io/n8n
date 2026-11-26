import { compare } from 'bcryptjs';

import { DUMMY_PASSWORD_HASH, PasswordUtility } from '../password.utility';

vi.mock('bcryptjs', () => ({
	compare: vi.fn(),
	hash: vi.fn(),
}));

describe('PasswordUtility', () => {
	const passwordUtility = new PasswordUtility();

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('compare()', () => {
		test('should compare against the stored hash when one exists', async () => {
			const storedHash = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0';
			vi.mocked(compare).mockImplementation(async () => true);

			const isMatch = await passwordUtility.compare('plaintext', storedHash);

			expect(isMatch).toBe(true);
			expect(compare).toHaveBeenCalledTimes(1);
			expect(compare).toHaveBeenCalledWith('plaintext', storedHash);
		});

		test('should compare against the dummy hash when no hash is stored', async () => {
			vi.mocked(compare).mockImplementation(async () => false);

			const isMatch = await passwordUtility.compare('plaintext', null);

			expect(isMatch).toBe(false);
			expect(compare).toHaveBeenCalledTimes(1);
			expect(compare).toHaveBeenCalledWith('plaintext', DUMMY_PASSWORD_HASH);
		});

		test.each([
			['a placeholder sentence', 'no password set'],
			['a marker string', '!token-exchange-no-password'],
			['a short random string', 'abcd1234'],
			['an empty string', ''],
			[
				'a hash with an unsupported cost',
				'$2b$00$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0',
			],
		])(
			'should compare against the dummy hash when the stored value is %s',
			async (_, storedValue) => {
				vi.mocked(compare).mockImplementation(async () => false);

				const isMatch = await passwordUtility.compare('plaintext', storedValue);

				expect(isMatch).toBe(false);
				expect(compare).toHaveBeenCalledTimes(1);
				expect(compare).toHaveBeenCalledWith('plaintext', DUMMY_PASSWORD_HASH);
			},
		);

		test('should return false when no hash is stored even if the dummy comparison matches', async () => {
			vi.mocked(compare).mockImplementation(async () => true);

			const isMatch = await passwordUtility.compare('plaintext', null);

			expect(isMatch).toBe(false);
		});
	});
});
