import { floorToSettings, settingsToFloor } from '../redaction-enforcement-mapper';

describe('redaction-enforcement-mapper', () => {
	describe('floorToSettings', () => {
		it('maps off → all booleans false', () => {
			expect(floorToSettings('off')).toEqual({
				enforced: false,
				manual: false,
				production: false,
			});
		});

		it('maps production → enforced + production only', () => {
			expect(floorToSettings('production')).toEqual({
				enforced: true,
				manual: false,
				production: true,
			});
		});

		it('maps all → enforced + manual + production', () => {
			expect(floorToSettings('all')).toEqual({
				enforced: true,
				manual: true,
				production: true,
			});
		});
	});

	describe('settingsToFloor', () => {
		it('maps {enforced: false} → off regardless of other flags', () => {
			expect(settingsToFloor({ enforced: false, manual: false, production: false })).toBe('off');
			expect(settingsToFloor({ enforced: false, manual: true, production: true })).toBe('off');
		});

		it('maps {enforced, production} → production', () => {
			expect(settingsToFloor({ enforced: true, manual: false, production: true })).toBe(
				'production',
			);
		});

		it('maps {enforced, manual, production} → all', () => {
			expect(settingsToFloor({ enforced: true, manual: true, production: true })).toBe('all');
		});

		it('normalizes upward when manual is true but production is false', () => {
			// Combination unreachable via the API; defensive fallback returns the
			// stricter floor so callers never see a weaker floor than what is stored.
			expect(settingsToFloor({ enforced: true, manual: true, production: false })).toBe('all');
		});
	});

	describe('round-trip', () => {
		it.each(['off', 'production', 'all'] as const)(
			'floor → settings → floor preserves %s',
			(floor) => {
				expect(settingsToFloor(floorToSettings(floor))).toBe(floor);
			},
		);
	});
});
