import type { GlobalConfig } from '@n8n/config';
import type { SettingsRepository, Settings } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import {
	discoveryUserKey,
	isClaudeMcpClient,
	McpDiscoveryActivityService,
} from './activity.service';

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
			await service.recordClaudeToolResult('member', 'claude-code', tool, 'success', 'workflow', 1);
			expect(rows.has(discoveryUserKey('member', 'claudeMcpUsedAt'))).toBe(true);
			expect(rows.has(discoveryUserKey('teammate', 'claudeMcpUsedAt'))).toBe(false);
		},
	);

	it.each([
		['Cursor', 'update_workflow', 'success', 'workflow', 1],
		['claude-code', 'update_workflow', 'error', 'workflow', 1],
		['claude-code', 'search_workflows', 'success', 'workflow', 1],
		['claude-code', 'update_workflow', 'success', undefined, 1],
		['claude-code', 'update_workflow', 'success', 'workflow', 0],
	] as const)(
		'does not count non-build or failed calls (%s, %s, %s)',
		async (client, tool, status, id, operations) => {
			await service.recordClaudeToolResult('member', client, tool, status, id, operations);
			expect(rows.has(discoveryUserKey('member', 'claudeMcpUsedAt'))).toBe(false);
		},
	);

	it('records connection separately from first use', async () => {
		await service.recordClaudeConnection('member', 'Claude', {
			authType: 'oauth',
			clientId: 'claude-id',
		});
		expect(rows.has(discoveryUserKey('member', 'claudeClient.claude-id'))).toBe(true);
		expect(rows.has(discoveryUserKey('member', 'claudeMcpUsedAt'))).toBe(false);
	});

	it('does not record self-hosted users', async () => {
		config.deployment.type = 'default';
		await service.recordFirstLogin('member', Date.now());
		await service.recordClaudeToolResult(
			'member',
			'Claude',
			'update_workflow',
			'success',
			'workflow',
		);
		expect(rows.size).toBe(0);
	});
	it.each([
		{ authType: 'oauth', clientId: 'client' },
		{ authType: 'api_key', apiKeyId: 'key' },
	] as const)('uses the handshake identity for legacy $authType tool calls', async (caller) => {
		await service.recordClaudeConnection('owner', 'Claude', caller);
		await service.recordClaudeToolResult(
			'owner',
			undefined,
			'create_workflow_from_code',
			'success',
			'workflow',
			undefined,
			caller,
		);
		expect(rows.has(discoveryUserKey('owner', 'claudeMcpUsedAt'))).toBe(true);
		await service.recordClaudeToolResult(
			'other',
			undefined,
			'update_workflow',
			'success',
			'workflow',
			1,
			caller,
		);
		expect(rows.has(discoveryUserKey('other', 'claudeMcpUsedAt'))).toBe(false);
	});

	it.each([
		{ clientName: undefined, marker: undefined },
		{ clientName: undefined, marker: '' },
		{ clientName: 'Cursor', marker: '10000' },
	])(
		'does not infer Claude from an absent claim or a different named client: %j',
		async ({ clientName, marker }) => {
			if (marker !== undefined) rows.set(discoveryUserKey('owner', 'claudeClient.client'), marker);
			await service.recordClaudeToolResult(
				'owner',
				clientName,
				'update_workflow',
				'success',
				'workflow',
				1,
				{ authType: 'oauth', clientId: 'client' },
			);
			expect(rows.has(discoveryUserKey('owner', 'claudeMcpUsedAt'))).toBe(false);
		},
	);

	it.each([
		['search_workflows', 'success', 'workflow', 1],
		['update_workflow', 'error', 'workflow', 1],
		['update_workflow', 'success', 'workflow', 0],
		['create_workflow_from_code', 'success', undefined, undefined],
	] as const)(
		'preserves the exit rules for legacy %s calls',
		async (tool, status, workflow, operations) => {
			const caller = { authType: 'api_key', apiKeyId: 'key' } as const;
			await service.recordClaudeConnection('owner', 'Claude', caller);
			await service.recordClaudeToolResult(
				'owner',
				undefined,
				tool,
				status,
				workflow,
				operations,
				caller,
			);
			expect(rows.has(discoveryUserKey('owner', 'claudeMcpUsedAt'))).toBe(false);
		},
	);
});
