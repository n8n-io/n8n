import { EventMessageTypeNames } from 'n8n-workflow';

import type { AbstractEventMessage } from '../abstract-event-message';
import { EventMessageAiNode } from '../event-message-ai-node';
import { EventMessageAudit } from '../event-message-audit';
import { EventMessageExecution } from '../event-message-execution';
import { EventMessageGeneric } from '../event-message-generic';
import { EventMessageMcp } from '../event-message-mcp';
import { EventMessageNode } from '../event-message-node';
import { EventMessageQueue } from '../event-message-queue';
import { EventMessageRunner } from '../event-message-runner';
import { EventMessageWorkflow } from '../event-message-workflow';

const messages: Array<[string, AbstractEventMessage]> = [
	['EventMessageAiNode', new EventMessageAiNode({ eventName: 'n8n.ai.memory.get.messages' })],
	['EventMessageAudit', new EventMessageAudit({ eventName: 'n8n.audit.user.signedup' })],
	['EventMessageExecution', new EventMessageExecution({ eventName: 'n8n.execution.throttled' })],
	['EventMessageGeneric', new EventMessageGeneric({ eventName: 'n8n.destination.test' })],
	['EventMessageMcp', new EventMessageMcp({ eventName: 'n8n.audit.mcp.tool.called' })],
	['EventMessageNode', new EventMessageNode({ eventName: 'n8n.node.started' })],
	['EventMessageQueue', new EventMessageQueue({ eventName: 'n8n.queue.job.enqueued' })],
	['EventMessageRunner', new EventMessageRunner({ eventName: 'n8n.runner.task.requested' })],
	['EventMessageWorkflow', new EventMessageWorkflow({ eventName: 'n8n.workflow.started' })],
];

describe('deserialize inherited from AbstractEventMessage', () => {
	test.each(messages)('%s applies options and payload of its own type', (_name, message) => {
		const result = message.deserialize({
			__type: message.__type,
			id: 'some-id',
			eventName: 'n8n.destination.test',
			message: 'some message',
			payload: { msg: 'some payload' },
		});

		expect(result).toBe(message);
		expect(message.id).toBe('some-id');
		expect(message.eventName).toBe('n8n.destination.test');
		expect(message.message).toBe('some message');
		expect(message.payload).toEqual({ msg: 'some payload' });
	});

	test.each(messages)('%s ignores data of another type', (_name, message) => {
		const { id, eventName, payload } = message;

		message.deserialize({
			__type: EventMessageTypeNames.confirm,
			id: 'other-id',
			eventName: 'n8n.destination.test',
			payload: { msg: 'other payload' },
		});

		expect(message.id).toBe(id);
		expect(message.eventName).toBe(eventName);
		expect(message.payload).toBe(payload);
	});
});
