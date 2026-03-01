import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository, IWorkflowDb } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import { McpEventRelay } from '../mcp.event-relay';

const createWorkflow = (overrides: Partial<IWorkflowDb> = {}): IWorkflowDb => ({
	id: 'wf-1',
	name: 'Test Workflow',
	nodes: [],
	connections: {},
	active: false,
	activeVersionId: null,
	isArchived: false,
	triggerCount: 0,
	settings: {},
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

describe('McpEventRelay', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const logger = mock<Logger>();
	const eventService = new EventService();

	new McpEventRelay(eventService, workflowRepository, logger).init();

	afterEach(() => {
		jest.clearAllMocks();
	});

	const createEvent = (workflow: IWorkflowDb): RelayEventMap['workflow-deactivated'] => ({
		user: {
			id: 'user-1',
			email: 'test@n8n.io',
			firstName: 'Test',
			lastName: 'User',
			role: { slug: 'owner' },
		},
		workflowId: workflow.id,
		workflow,
		publicApi: false,
		deactivatedVersionId: 'version-1',
	});

	describe('workflow-deactivated', () => {
		it('should reset availableInMCP when workflow is genuinely deactivated', async () => {
			const event = createEvent(
				createWorkflow({
					activeVersionId: null, // genuinely deactivated
					settings: { availableInMCP: true },
				}),
			);

			eventService.emit('workflow-deactivated', event);
			await new Promise(process.nextTick);

			expect(workflowRepository.update).toHaveBeenCalledWith('wf-1', {
				settings: expect.objectContaining({ availableInMCP: false }),
			});
		});

		it('should NOT reset availableInMCP during re-activation (settings update)', async () => {
			const event = createEvent(
				createWorkflow({
					active: true,
					activeVersionId: 'version-1', // still set → re-activation
					settings: { availableInMCP: true },
				}),
			);

			eventService.emit('workflow-deactivated', event);
			await new Promise(process.nextTick);

			expect(workflowRepository.update).not.toHaveBeenCalled();
		});

		it('should not update when availableInMCP is already false', async () => {
			const event = createEvent(
				createWorkflow({
					activeVersionId: null,
					settings: { availableInMCP: false },
				}),
			);

			eventService.emit('workflow-deactivated', event);
			await new Promise(process.nextTick);

			expect(workflowRepository.update).not.toHaveBeenCalled();
		});

		it('should not update when settings are undefined', async () => {
			const event = createEvent(
				createWorkflow({
					activeVersionId: null,
					settings: undefined,
				}),
			);

			eventService.emit('workflow-deactivated', event);
			await new Promise(process.nextTick);

			expect(workflowRepository.update).not.toHaveBeenCalled();
		});
	});
});
