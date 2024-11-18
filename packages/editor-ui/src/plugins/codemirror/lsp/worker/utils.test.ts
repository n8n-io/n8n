import { generateExtensionTypes } from './utils';

describe('typescript worker utils', () => {
	describe('generateExtensionTypes', () => {
		it('should work', () => {
			expect(generateExtensionTypes()).toEqual('');
		});
	});
});
