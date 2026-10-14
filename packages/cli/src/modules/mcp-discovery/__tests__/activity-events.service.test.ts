// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { EventService } from '@n8n/backend-services';
import type { Logger } from '@n8n/backend-common';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { McpDiscoveryActivityService } from '../activity.service';
import { McpDiscoveryActivityEvents } from '../activity-events.service';

const events = new EventService();
const activity = mock<McpDiscoveryActivityService>();
const logger = mock<Logger>();
let listener: McpDiscoveryActivityEvents;

beforeEach(() => {
	vi.resetAllMocks();
	events.removeAllListeners();
	activity.recordFirstLogin.mockResolvedValue(undefined);
	activity.recordAssistantMutation.mockResolvedValue(undefined);
	activity.recordClaudeConnection.mockResolvedValue(undefined);
	activity.recordMcpToolResult.mockResolvedValue(undefined);
	listener = new McpDiscoveryActivityEvents(events, activity, logger);
	listener.init();
});

it('captures first login without waiting for a browser visit', async () => {
	events.emit('experiment-user-first-login', { userId: 'owner', at: 100 });
	await listener.flush('owner');
	expect(activity.recordFirstLogin).toHaveBeenCalledExactlyOnceWith('owner', 100);
});

it('records Assistant changes for their author before enrollment', async () => {
	events.emit('experiment-assistant-change-saved', { userId: 'author', at: 500 });
	await listener.flush('author');
	expect(activity.recordAssistantMutation).toHaveBeenCalledExactlyOnceWith('author', 500);
});

it('does not assign while an observed activity write is pending', async () => {
	const write = createDeferredPromise<undefined>();
	activity.recordAssistantMutation.mockReturnValueOnce(write.promise);
	events.emit('experiment-assistant-change-saved', { userId: 'owner', at: 500 });
	let ready = false;
	const flush = listener.flush('owner').then(() => {
		ready = true;
	});
	await Promise.resolve();
	expect(ready).toBe(false);
	write.resolve(undefined);
	await flush;
	expect(ready).toBe(true);
});

it.each(['oauth', 'api_key'] as const)('preserves %s connection identity', async (authType) => {
	const caller =
		authType === 'oauth' ? { authType, clientId: 'client' } : { authType, apiKeyId: 'key' };
	events.emit('experiment-mcp-client-connected', { userId: 'owner', clientName: 'Claude', caller });
	await listener.flush('owner');
	expect(activity.recordClaudeConnection).toHaveBeenCalledWith('owner', 'Claude', caller);
});

it.each([0, 2, undefined])(
	'preserves the workflow write result (%s operations)',
	async (operations) => {
		events.emit('experiment-mcp-workflow-write-completed', {
			userId: 'owner',
			toolName: 'update_workflow',
			workflowId: 'workflow',
			status: 'success',
			structuredContent: { appliedOperations: operations },
		});
		await listener.flush('owner');
		expect(activity.recordMcpToolResult).toHaveBeenCalledWith(
			'owner',
			'update_workflow',
			'success',
			'workflow',
			operations,
		);
	},
);

it('logs persistence errors without rejecting the event or blocking later visits', async () => {
	const error = new Error('Database unavailable');
	activity.recordMcpToolResult.mockRejectedValueOnce(error);
	expect(() =>
		events.emit('experiment-mcp-workflow-write-completed', {
			userId: 'owner',
			toolName: 'update_workflow',
			status: 'success',
		}),
	).not.toThrow();
	await expect(listener.flush('owner')).resolves.toBeUndefined();
	expect(logger.warn).toHaveBeenCalledWith('Failed to record MCP discovery activity', { error });
});

it('registers the listeners once', async () => {
	listener.init();
	events.emit('experiment-user-first-login', { userId: 'owner', at: 100 });
	await listener.flush('owner');
	expect(activity.recordFirstLogin).toHaveBeenCalledOnce();
});

it('records a connection before the next write and does not block another user', async () => {
	const connection = createDeferredPromise<undefined>();
	activity.recordClaudeConnection.mockReturnValueOnce(connection.promise);
	events.emit('experiment-mcp-client-connected', { userId: 'owner', clientName: 'Claude' });
	events.emit('experiment-mcp-workflow-write-completed', {
		userId: 'owner',
		toolName: 'update_workflow',
		status: 'success',
		workflowId: 'workflow',
	});
	events.emit('experiment-mcp-workflow-write-completed', {
		userId: 'another-user',
		toolName: 'create_workflow_from_code',
		status: 'success',
		workflowId: 'another-workflow',
	});
	await listener.flush('another-user');
	expect(activity.recordMcpToolResult).toHaveBeenCalledExactlyOnceWith(
		'another-user',
		'create_workflow_from_code',
		'success',
		'another-workflow',
		undefined,
	);
	connection.resolve(undefined);
	await listener.flush('owner');
	expect(activity.recordMcpToolResult).toHaveBeenCalledTimes(2);
	expect(activity.recordMcpToolResult).toHaveBeenLastCalledWith(
		'owner',
		'update_workflow',
		'success',
		'workflow',
		undefined,
	);
});
// EOF Experiment cleanup
