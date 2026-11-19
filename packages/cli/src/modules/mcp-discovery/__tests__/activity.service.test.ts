// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import type { GlobalConfig } from '@n8n/config';
import type { SettingsRepository, Settings } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { EventService } from '@n8n/backend-services';
import { McpDiscoveryActivityEvents } from '../activity-events.service';

import {
	discoveryUserKey,
	isClaudeMcpClient,
	McpDiscoveryActivityService,
} from '../activity.service';

vi.mock('@n8n/db', () => ({ SettingsRepository: class {} }));
vi.mock('@n8n/config', () => ({ GlobalConfig: class {} }));

describe('MCP discovery activity', () => {
	const settings = mock<SettingsRepository>();
	const config = mock<GlobalConfig>({ deployment: { type: 'cloud' } });
	const rows = new Map<string, string>();
	const service = new McpDiscoveryActivityService(settings, config, mock());

	beforeEach(() => {
		vi.resetAllMocks();
		rows.clear();
		vi.useFakeTimers();
		vi.setSystemTime(10_000);
		config.deployment.type = 'cloud';
		settings.findByKey.mockImplementation(async (key) => {
			const value = rows.get(key);
			return value === undefined ? null : mock<Settings>({ key, value });
		});
		settings.claimKey.mockImplementation(async (key, value) => {
			if (rows.has(key)) return false;
			rows.set(key, value);
			return true;
		});
	});
	afterEach(() => vi.useRealTimers());

	it('keeps the first login across later sessions', async () => {
		await service.recordFirstLogin('member', Date.now());
		vi.setSystemTime(20_000);
		await service.recordFirstLogin('member', Date.now());
		expect(rows.get(discoveryUserKey('member', 'firstLoginAt'))).toBe('10000');
	});

	it('stores the captured login time rather than the later write time', async () => {
		vi.setSystemTime(20_000);
		await service.recordFirstLogin('member', 10_000);
		expect(rows.get(discoveryUserKey('member', 'firstLoginAt'))).toBe('10000');
	});

	it('keeps the first Assistant mutation as the cutoff history', async () => {
		await service.recordAssistantMutation('member');
		vi.setSystemTime(50_000);
		await service.recordAssistantMutation('member');
		expect(rows.get(discoveryUserKey('member', 'assistantMutationAt'))).toBe('10000');
	});

	it('does not fail a saved Assistant edit if bookkeeping fails', async () => {
		settings.claimKey.mockRejectedValue(new Error('Database unavailable'));
		await expect(service.recordAssistantMutation('member')).resolves.toBeUndefined();
	});

	it.each(['Anthropic/ClaudeAI', 'claude-code', 'Anthropic/Toolbox', 'claude-ai'])(
		'recognizes %s',
		(name) => expect(isClaudeMcpClient(name)).toBe(true),
	);

	it.each(['create_workflow_from_code', 'update_workflow'])(
		'records successful %s calls for the caller only',
		async (tool) => {
			await service.recordMcpToolResult('member', tool, 'success', 'workflow', 1);
			expect(rows.has(discoveryUserKey('member', 'claudeMcpUsedAt'))).toBe(true);
			expect(rows.has(discoveryUserKey('teammate', 'claudeMcpUsedAt'))).toBe(false);
		},
	);

	it.each([
		['update_workflow', 'error', 'workflow', 1],
		['search_workflows', 'success', 'workflow', 1],
		['update_workflow', 'success', undefined, 1],
		['update_workflow', 'success', 'workflow', 0],
	] as const)(
		'does not count non-build or failed calls (%s, %s)',
		async (tool, status, id, operations) => {
			await service.recordMcpToolResult('member', tool, status, id, operations);
			expect(rows.has(discoveryUserKey('member', 'claudeMcpUsedAt'))).toBe(false);
		},
	);

	it('exits after a successful MCP write without a client identity', async () => {
		const events = new EventService();
		const listener = new McpDiscoveryActivityEvents(events, service, mock());
		listener.init();
		events.emit('experiment-mcp-workflow-write-completed', {
			userId: 'owner',
			toolName: 'update_workflow',
			status: 'success',
			workflowId: 'workflow',
			structuredContent: { appliedOperations: 1 },
		});
		await listener.flush('owner');
		expect(rows.has(discoveryUserKey('owner', 'claudeMcpUsedAt'))).toBe(true);
		expect(rows.size).toBe(1);
	});

	it('records a write without a connection observation or credential identity', async () => {
		await service.recordMcpToolResult('owner', 'update_workflow', 'success', 'workflow', 1);
		expect(rows.get(discoveryUserKey('owner', 'claudeMcpUsedAt'))).toBe('10000');
		expect(settings.findByKey).not.toHaveBeenCalled();
		expect(rows.has(discoveryUserKey('owner', 'claudeClient.client'))).toBe(false);
	});

	it.each([
		{ authType: 'oauth', clientId: 'client' },
		{ authType: 'api_key', apiKeyId: 'key' },
	] as const)('records Claude connection separately from use with $authType', async (caller) => {
		await service.recordClaudeConnection('member', 'Claude', caller);
		expect(rows.size).toBe(1);
		expect(rows.has(discoveryUserKey('member', 'claudeMcpUsedAt'))).toBe(false);
	});

	it.each(['Cursor', undefined])('does not mark %s as a Claude connection', async (clientName) => {
		await service.recordClaudeConnection('owner', clientName, {
			authType: 'oauth',
			clientId: 'client',
		});
		expect(rows.size).toBe(0);
	});

	it('does not record self-hosted users', async () => {
		config.deployment.type = 'default';
		await service.recordFirstLogin('member', Date.now());
		await service.recordMcpToolResult('member', 'update_workflow', 'success', 'workflow');
		expect(rows.size).toBe(0);
	});
});
// EOF Experiment cleanup
