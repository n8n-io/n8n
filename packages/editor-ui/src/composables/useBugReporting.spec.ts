import type { Mock } from 'vitest';
import { describe, it, expect, vi } from 'vitest';
import { useBugReporting } from './useBugReporting';
import { useDebugInfo } from './useDebugInfo';

vi.mock('@/composables/useDebugInfo');

describe('useBugReporting', () => {
	beforeEach(() => {
		(useDebugInfo as unknown as Mock).mockReturnValue({
			generateDebugInfo: () => 'mocked debug info',
		});
	});

	it('should generate the correct reporting URL', () => {
		const { getReportingURL } = useBugReporting();
		const url = getReportingURL();

		expect(url).toContain('mocked+debug+info');
		expect(url).toEqual(
			'https://github.com/n8n-io/n8n/issues/new?labels=bug-report&body=%0A%3C%21--+Please+follow+the+template+below.+Skip+the+questions+that+are+not+relevant+to+you.+--%3E%0A%0A%23%23+Describe+the+problem%2Ferror%2Fquestion%0A%0A%0A%23%23+What+is+the+error+message+%28if+any%29%3F%0A%0A%0A%23%23+Please+share+your+workflow%2Fscreenshots%2Frecording%0A%0A%60%60%60%0A%28Select+the+nodes+on+your+canvas+and+use+the+keyboard+shortcuts+CMD%2BC%2FCTRL%2BC+and+CMD%2BV%2FCTRL%2BV+to+copy+and+paste+the+workflow.%29%0A%60%60%60%0A%0A%0A%23%23+Share+the+output+returned+by+the+last+node%0A%3C%21--+If+you+need+help+with+data+transformations%2C+please+also+share+your+expected+output.+--%3E%0A%0A%0Amocked+debug+info%7D',
		);
	});
});
