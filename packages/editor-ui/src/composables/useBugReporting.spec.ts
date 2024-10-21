import { describe, it, expect, vi } from 'vitest';
import { useBugReporting } from './useBugReporting';

vi.mock('@/composables/useDebugInfo', () => ({
	useDebugInfo: () => ({
		generateDebugInfo: () => 'mocked debug info',
	}),
}));

describe('useBugReporting', () => {
	it('should generate the correct reporting URL', () => {
		const { getReportingURL } = useBugReporting();
		const url = getReportingURL();

		expect(url).toContain('mocked+debug+info');
		expect(url).toMatchSnapshot();
	});
});
