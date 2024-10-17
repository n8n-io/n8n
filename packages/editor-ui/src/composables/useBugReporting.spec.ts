import { describe, it, expect, vi } from 'vitest';
import { useBugReporting } from './useBugReporting';
import { useDebugInfo } from './useDebugInfo';

vi.mock('@/composables/useDebugInfo', () => ({
	useDebugInfo: vi.fn(() => ({
		generateDebugInfo: vi.fn(),
	})),
}));

describe('useBugReporting', () => {
	let debugInfo: ReturnType<typeof useDebugInfo>;

	beforeEach(() => {
		debugInfo = useDebugInfo();
	});

	it('should generate the correct reporting URL', () => {
		(debugInfo.generateDebugInfo as jest.Mock).mockReturnValue('mocked debug info');

		const { getReportingURL } = useBugReporting();
		const config = { medium: 'test-medium' };
		const url = getReportingURL(config);

		expect(url).toContain(
			'https://community.n8n.io/new-topic?utm_source=n8n_app&category=questions&tags=bug-report',
		);
	});
});
