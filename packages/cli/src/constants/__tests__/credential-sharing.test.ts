import { isCredSharingEnabled } from '@/constants/credential-sharing';

describe('isCredSharingEnabled', () => {
	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_CRED_SHARING;
	});

	it('should return true when N8N_ENV_FEAT_CRED_SHARING is "true"', () => {
		process.env.N8N_ENV_FEAT_CRED_SHARING = 'true';

		expect(isCredSharingEnabled()).toBe(true);
	});

	it('should return false when N8N_ENV_FEAT_CRED_SHARING is unset', () => {
		expect(isCredSharingEnabled()).toBe(false);
	});

	it.each(['false', 'TRUE', '1', ''])(
		'should return false when N8N_ENV_FEAT_CRED_SHARING is %p',
		(value) => {
			process.env.N8N_ENV_FEAT_CRED_SHARING = value;

			expect(isCredSharingEnabled()).toBe(false);
		},
	);
});
