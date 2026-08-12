import type { IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';
import { TriggerActivityEventRelay } from '@/events/relays/trigger-activity.event-relay';
import type { Push } from '@/push';

describe('TriggerActivityEventRelay', () => {
	const eventService = new EventService();
	const push = mock<Push>();
	new TriggerActivityEventRelay(eventService, push).init();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should broadcast triggerFired for trigger-mode executions', () => {
		eventService.emit('workflow-pre-execute', {
			executionId: 'e1',
			data: { id: 'wf1' } as IWorkflowBase,
			mode: 'trigger',
		});

		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'triggerFired',
			data: { workflowId: 'wf1', mode: 'trigger' },
		});
	});

	it('should broadcast triggerFired for sub-workflow executions', () => {
		eventService.emit('workflow-pre-execute', {
			executionId: 'e3',
			data: { id: 'wf2' } as IWorkflowBase,
			mode: 'integrated',
		});

		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'triggerFired',
			data: { workflowId: 'wf2', mode: 'integrated' },
		});
	});

	it('should ignore executions of other modes', () => {
		eventService.emit('workflow-pre-execute', {
			executionId: 'e2',
			data: { id: 'wf1' } as IWorkflowBase,
			mode: 'webhook',
		});

		expect(push.broadcast).not.toHaveBeenCalled();
	});
});
