import { missingIds } from '../plan-template';

describe('missingIds', () => {
	it('should not take a longer issue key for a shorter one', () => {
		expect(missingIds(['trust120'], 'TRUST-1209 is open')).toEqual(['trust120']);
	});

	it('should find an issue key and a UUID without dashes or case', () => {
		const text = 'TRUST-1209 has id 2B860C6F-9CD3-4F5D-BCE2-2B7FEA794024';
		expect(missingIds(['trust1209', '2b860c6f9cd34f5dbce22b7fea794024'], text)).toEqual([]);
	});
});
