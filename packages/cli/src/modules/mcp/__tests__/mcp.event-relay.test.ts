import { Logger } from '@n8n/backend-common';
import { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock, mockDeep } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { CacheService } from '@/services/cache/cache.service';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import { McpEventRelay } from '../mcp.event-relay';

describe('McpEventRelay', () => {
	const eventService = mock<EventService>();
	const workflowRepository = mockDeep<WorkflowRepository>();
	const cacheService = mockDeep<CacheService>();
	const logger = mock<Logger>();

	let relay: McpEventRelay;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.set(EventService, eventService);
		Container.set(WorkflowRepository, workflowRepository);
		Container.set(CacheService, cacheService);
		Container.set(Logger, logger);
		relay = Container.get(McpEventRelay);
	});

	describe('init', () => {
		it('should set up listeners for workflow events', () => {
			relay.init();

			// setupListeners calls eventService.on for each event
			expect(eventService.on).toHaveBeenCalledWith('workflow-deactivated', expect.any(Function));
			expect(eventService.on).toHaveBeenCalledWith('workflow-saved', expect.any(Function));
		});
	});

	describe('onWorkflowSaved', () => {
		it('should invalidate MCP workflow cache when workflow is saved', async () => {
			relay.init();

			const workflowId = uuid();
			const workflow = Object.assign(new WorkflowEntity(), {
				id: workflowId,
				name: 'Test Workflow',
				settings: {
					availableInMCP: true,
					callerPolicy: 'workflowsFromSameOwner',
				},
			});

			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user-1',
					email: 'user@example.com',
				},
				workflow,
				publicApi: false,
			};

			// Get the handler that was registered via eventService.on
			const onCalls = (eventService.on as jest.Mock).mock.calls;
			const workflowSavedCall = onCalls.find((call) => call[0] === 'workflow-saved');
			const workflowSavedHandler = workflowSavedCall[1];

			await workflowSavedHandler(event);

			// Verify cache keys were deleted
			expect(cacheService.delete).toHaveBeenCalledTimes(3);
			expect(cacheService.delete).toHaveBeenCalledWith(`mcp:workflow:${workflowId}`);
			expect(cacheService.delete).toHaveBeenCalledWith(`mcp:workflow:details:${workflowId}`);
			expect(cacheService.delete).toHaveBeenCalledWith(`mcp:workflow:metadata:${workflowId}`);

			expect(logger.debug).toHaveBeenCalledWith(
				'Invalidated MCP workflow cache after workflow update',
				{
					workflowId,
					workflowName: workflow.name,
				},
			);
		});

		it('should handle workflow without id gracefully', async () => {
			relay.init();

			const workflow = Object.assign(new WorkflowEntity(), {
				id: null,
				name: 'Test Workflow',
			});

			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user-1',
					email: 'user@example.com',
				},
				workflow,
				publicApi: false,
			};

			const onCalls = (eventService.on as jest.Mock).mock.calls;
			const workflowSavedCall = onCalls.find((call) => call[0] === 'workflow-saved');
			const workflowSavedHandler = workflowSavedCall[1];

			await workflowSavedHandler(event);

			// Should not attempt to delete cache
			expect(cacheService.delete).not.toHaveBeenCalled();
		});

		it('should handle cache deletion errors gracefully', async () => {
			relay.init();

			const workflowId = uuid();
			const workflow = Object.assign(new WorkflowEntity(), {
				id: workflowId,
				name: 'Test Workflow',
			});

			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user-1',
					email: 'user@example.com',
				},
				workflow,
				publicApi: false,
			};

			const error = new Error('Cache deletion failed');
			cacheService.delete.mockRejectedValue(error);

			const onCalls = (eventService.on as jest.Mock).mock.calls;
			const workflowSavedCall = onCalls.find((call) => call[0] === 'workflow-saved');
			const workflowSavedHandler = workflowSavedCall[1];

			await workflowSavedHandler(event);

			expect(logger.warn).toHaveBeenCalledWith('Failed to invalidate MCP workflow cache', {
				workflowId,
				error: 'Cache deletion failed',
			});
		});
	});

	describe('onWorkflowDeactivated', () => {
		it('should disable MCP access when workflow is deactivated', async () => {
			relay.init();

			const workflowId = uuid();
			const workflow = Object.assign(new WorkflowEntity(), {
				id: workflowId,
				name: 'Test Workflow',
				settings: {
					availableInMCP: true,
				},
			});

			const event: RelayEventMap['workflow-deactivated'] = {
				user: {
					id: 'user-1',
					email: 'user@example.com',
				},
				workflowId,
				workflow,
				publicApi: false,
			};

			const onCalls = (eventService.on as jest.Mock).mock.calls;
			const workflowDeactivatedCall = onCalls.find((call) => call[0] === 'workflow-deactivated');
			const workflowDeactivatedHandler = workflowDeactivatedCall[1];

			await workflowDeactivatedHandler(event);

			expect(workflowRepository.update).toHaveBeenCalledWith(workflowId, {
				settings: {
					availableInMCP: false,
				},
			});
		});
	});

	describe('regression: MCP cache invalidation on workflow update', () => {
		it('should invalidate cache when callerPolicy is removed from workflow settings', async () => {
			relay.init();

			const workflowId = uuid();
			const workflowBefore = Object.assign(new WorkflowEntity(), {
				id: workflowId,
				name: 'Test Workflow',
				settings: {
					availableInMCP: true,
					callerPolicy: 'workflowsFromSameOwner',
				},
			});

			const workflowAfter = Object.assign(new WorkflowEntity(), {
				id: workflowId,
				name: 'Test Workflow',
				settings: {
					availableInMCP: true,
					// callerPolicy removed
				},
			});

			// Simulate workflow update event
			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user-1',
					email: 'user@example.com',
				},
				workflow: workflowAfter,
				publicApi: false,
				previousWorkflow: workflowBefore,
			};

			const onCalls = (eventService.on as jest.Mock).mock.calls;
			const workflowSavedCall = onCalls.find((call) => call[0] === 'workflow-saved');
			const workflowSavedHandler = workflowSavedCall[1];

			await workflowSavedHandler(event);

			// Verify cache was invalidated
			expect(cacheService.delete).toHaveBeenCalledWith(`mcp:workflow:${workflowId}`);
			expect(cacheService.delete).toHaveBeenCalledWith(`mcp:workflow:details:${workflowId}`);
			expect(cacheService.delete).toHaveBeenCalledWith(`mcp:workflow:metadata:${workflowId}`);
		});

		it('should invalidate cache on every workflow save, not just when callerPolicy changes', async () => {
			relay.init();

			const workflowId = uuid();
			const workflow = Object.assign(new WorkflowEntity(), {
				id: workflowId,
				name: 'Test Workflow',
				settings: {
					availableInMCP: true,
					timezone: 'America/New_York',
				},
			});

			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user-1',
					email: 'user@example.com',
				},
				workflow,
				publicApi: false,
			};

			const onCalls = (eventService.on as jest.Mock).mock.calls;
			const workflowSavedCall = onCalls.find((call) => call[0] === 'workflow-saved');
			const workflowSavedHandler = workflowSavedCall[1];

			await workflowSavedHandler(event);

			// Cache should be invalidated on any workflow save
			expect(cacheService.delete).toHaveBeenCalledTimes(3);
		});
	});
});
