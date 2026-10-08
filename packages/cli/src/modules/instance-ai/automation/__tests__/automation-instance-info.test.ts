import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { AutomationInstanceInfo } from '../automation-instance-info';

describe('AutomationInstanceInfo', () => {
	const urlService = mock<UrlService>();
	const globalConfig = mock<GlobalConfig>({ generic: { timezone: 'Europe/Berlin' } });
	const instance = new AutomationInstanceInfo(urlService, globalConfig);

	beforeEach(() => {
		vi.resetAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com/base');
	});

	it('links to the workflow in the editor of this instance', () => {
		expect(instance.workflowUrl('wf-1')).toBe('https://n8n.example.com/base/workflow/wf-1');
	});

	it('encodes the workflow id in the link', () => {
		expect(instance.workflowUrl('wf 1/2?x')).toBe(
			'https://n8n.example.com/base/workflow/wf%201%2F2%3Fx',
		);
	});

	it('gives the default time zone of the instance', () => {
		expect(instance.defaultTimezone).toBe('Europe/Berlin');
	});
});
