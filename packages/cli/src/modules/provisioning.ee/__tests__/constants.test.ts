import { PROVISIONING_PREFERENCES_DB_KEY } from '../constants';

describe('constants', () => {
	it('should have the correct constants', () => {
		expect(PROVISIONING_PREFERENCES_DB_KEY).toBe('features.provisioning');
	});
});
