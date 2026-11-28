import type { EventService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import { RuntimeCredentialUsageAudit } from '../runtime-credential-usage-audit.service';

const use = {
	alias: 'tenantKey',
	credentialId: 'runtime-abc',
	credentialType: 'httpBearerAuth',
	workflowId: 'wf1',
	executionId: 'exec1',
	nodeName: 'HTTP Request',
	nodeType: 'n8n-nodes-base.httpRequest',
};

describe('RuntimeCredentialUsageAudit', () => {
	const eventService = mock<EventService>();
	let audit: RuntimeCredentialUsageAudit;

	beforeEach(() => {
		vi.clearAllMocks();
		audit = new RuntimeCredentialUsageAudit(eventService);
	});

	it('emits the event with ids and names only', () => {
		audit.record(use);

		expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('runtime-credential-used', use);
	});

	it('emits once for the same execution, stub and node', () => {
		audit.record(use);
		audit.record(use);
		audit.record(use);

		expect(eventService.emit).toHaveBeenCalledTimes(1);
	});

	it('emits again for another node, stub or execution', () => {
		audit.record(use);
		audit.record({ ...use, nodeName: 'Other node' });
		audit.record({ ...use, credentialId: 'runtime-def' });
		audit.record({ ...use, executionId: 'exec2' });

		expect(eventService.emit).toHaveBeenCalledTimes(4);
	});

	it('emits every time when the run has no execution id', () => {
		audit.record({ ...use, executionId: undefined });
		audit.record({ ...use, executionId: undefined });

		expect(eventService.emit).toHaveBeenCalledTimes(2);
	});
});
