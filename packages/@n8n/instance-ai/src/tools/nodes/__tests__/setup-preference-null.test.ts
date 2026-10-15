import { addSetupPreference } from '../setup-preference';

vi.mock('../credential-setupability.json', () => ({
	default: [
		{ id: 'knownCredential', setupability: 0.42, popularity: 0.26 },
		{ id: 'unknownCredential', setupability: null, popularity: null },
	],
}));

describe('credential setup preference with missing data', () => {
	it('preserves missing popularity and rounds known popularity', () => {
		expect(addSetupPreference({}, ['knownCredential', 'unknownCredential'])).toEqual({
			setupPreference: [
				{
					type: 'knownCredential',
					setupCompletionPercent: 42,
					popularityScore: 0.3,
				},
				{
					type: 'unknownCredential',
					setupCompletionPercent: null,
					popularityScore: null,
				},
			],
		});
	});
});
