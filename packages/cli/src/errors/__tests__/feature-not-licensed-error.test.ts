import { FeatureNotLicensedError } from '../feature-not-licensed.error';

describe('FeatureNotLicensedError', () => {
	it('should have a stack property', () => {
		const error = new FeatureNotLicensedError('feat:multipleMainInstances');
		expect(error.stack).toBe('');
	});
});
