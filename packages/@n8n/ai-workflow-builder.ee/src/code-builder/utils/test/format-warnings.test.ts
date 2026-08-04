import { WarningTracker } from '../../state/warning-tracker';
import type { ValidationWarning } from '../../types';
import { formatWarnings } from '../format-warnings';

describe('formatWarnings', () => {
	it('should format warnings without tracker', () => {
		const warnings: ValidationWarning[] = [
			{ code: 'WARN001', message: 'Missing parameter' },
			{ code: 'WARN002', message: 'Invalid connection' },
		];

		const result = formatWarnings(warnings);

		expect(result).toBe('- [WARN001] Missing parameter\n- [WARN002] Invalid connection');
	});

	it('should return empty string for empty array', () => {
		expect(formatWarnings([])).toBe('');
	});

	it('should annotate pre-existing warnings when tracker is provided', () => {
		const tracker = new WarningTracker();
		const preExisting: ValidationWarning = {
			code: 'WARN001',
			message: 'Missing parameter',
			nodeName: 'HTTP Request',
		};
		const newWarning: ValidationWarning = {
			code: 'WARN002',
			message: 'Invalid connection',
		};

		tracker.markAsPreExisting([preExisting]);

		const result = formatWarnings([preExisting, newWarning], tracker);

		expect(result).toBe(
			'- [WARN001] [pre-existing] Missing parameter\n- [WARN002] Invalid connection',
		);
	});

	it('should not annotate when tracker has no pre-existing warnings', () => {
		const tracker = new WarningTracker();
		const warnings: ValidationWarning[] = [{ code: 'WARN001', message: 'Missing parameter' }];

		const result = formatWarnings(warnings, tracker);

		expect(result).toBe('- [WARN001] Missing parameter');
	});

	it('should handle single warning', () => {
		const warnings: ValidationWarning[] = [{ code: 'ERR001', message: 'Some error' }];

		const result = formatWarnings(warnings);

		expect(result).toBe('- [ERR001] Some error');
	});

	it('should annotate all pre-existing warnings in a mixed list', () => {
		const tracker = new WarningTracker();
		const w1: ValidationWarning = { code: 'WARN001', message: 'First', nodeName: 'Node1' };
		const w2: ValidationWarning = { code: 'WARN002', message: 'Second', nodeName: 'Node2' };
		const w3: ValidationWarning = { code: 'WARN003', message: 'Third' };

		tracker.markAsPreExisting([w1, w3]);

		const result = formatWarnings([w1, w2, w3], tracker);

		const lines = result.split('\n');
		expect(lines[0]).toBe('- [WARN001] [pre-existing] First');
		expect(lines[1]).toBe('- [WARN002] Second');
		expect(lines[2]).toBe('- [WARN003] [pre-existing] Third');
	});
});
