/**
 * Test to verify spelling corrections in Cortex ResponderDescription
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Cortex ResponderDescription Spelling Corrections', () => {
	it('should have correct spelling in responder description fields', () => {
		const filePath = join(__dirname, '..', 'ResponderDescription.ts');
		const fileContent = readFileSync(filePath, 'utf-8');

		// Verify the description uses correct spelling
		expect(fileContent).toContain('separated attributes');
		
		// Ensure old misspelling is not present
		expect(fileContent).not.toContain('seperated attributes');
	});
});