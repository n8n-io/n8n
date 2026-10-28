import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import { hitlConfigurationToolKeys, hitlConfigurationUpdates } from '../utils/hitlConfiguration';

const configuration: AgentHitlConfiguration = {
	id: 'review',
	name: 'Review',
	method: 'workflow',
	workflowId: 'workflow',
};
const route = { type: 'configuration', configurationId: 'review' } as const;
function config(): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'test',
		instructions: 'Help',
		hitlConfigurations: [configuration],
		tools: [
			{ type: 'node', name: 'Send', node: { nodeType: 'slack', nodeTypeVersion: 1 } },
			{ type: 'workflow', workflow: 'Write', requireApproval: true, approvalRoute: route },
			{
				type: 'custom',
				id: 'other',
				requireApproval: true,
				approvalRoute: { type: 'configuration', configurationId: 'other' },
			},
		],
		mcpServers: [
			{
				name: 'Server',
				url: 'https://example.com',
				transport: 'streamableHttp',
				authentication: 'none',
				approvalRoute: route,
				toolPermissions: {
					categories: { read: 'blocked', write: 'require_approval' },
					tools: { remove: 'blocked' },
				},
			},
		],
	};
}
it('reads attachments from the current tool and MCP routes', () => {
	expect(hitlConfigurationToolKeys(config(), 'review')).toEqual([
		'tool:workflow:Write',
		'mcp:Server',
	]);
	expect(hitlConfigurationToolKeys(config())).toEqual([]);
});
it('saves attachment changes and enables approval without changing other routes', () => {
	const current = config();
	const updates = hitlConfigurationUpdates(current, configuration, ['tool:node:Send']);
	expect(updates.hitlConfigurations).toEqual([configuration]);
	expect(updates.tools?.[0]).toEqual({
		...current.tools?.[0],
		requireApproval: true,
		approvalRoute: route,
	});
	expect(updates.tools?.[1]).toEqual({ ...current.tools?.[1], approvalRoute: undefined });
	expect(updates.tools?.[2]).toBe(current.tools?.[2]);
	expect(updates.mcpServers?.[0]).toEqual({ ...current.mcpServers?.[0], approvalRoute: undefined });
	expect(current.tools?.[0].requireApproval).toBeUndefined();
});
it('keeps existing MCP approval rules when assigning a destination', () => {
	const current = config();
	expect(
		hitlConfigurationUpdates(current, configuration, ['mcp:Server']).mcpServers?.[0]
			.toolPermissions,
	).toBe(current.mcpServers?.[0].toolPermissions);
});
it('enables MCP approval and keeps blocked categories and tools', () => {
	const current = config();
	if (!current.mcpServers?.[0]) throw new Error('Missing server fixture');
	current.mcpServers[0].toolPermissions = {
		categories: { read: 'always_allow', write: 'blocked' },
		tools: { search: 'always_allow', remove: 'blocked' },
	};
	expect(
		hitlConfigurationUpdates(current, configuration, ['mcp:Server']).mcpServers?.[0]
			.toolPermissions,
	).toEqual({
		categories: { read: 'require_approval', write: 'blocked' },
		tools: { search: 'require_approval', remove: 'blocked' },
	});
});
it('only updates the configuration when attachments were not edited', () => {
	expect(hitlConfigurationUpdates(config(), { ...configuration, name: 'Renamed' })).toEqual({
		hitlConfigurations: [{ ...configuration, name: 'Renamed' }],
	});
});
it('clears every attachment when the selection is empty', () => {
	const updates = hitlConfigurationUpdates(config(), configuration, []);
	expect(hitlConfigurationToolKeys({ ...config(), ...updates }, configuration.id)).toEqual([]);
});

it('selects workflow aliases independently', () => {
	const current = {
		...config(),
		tools: [
			{ type: 'workflow', workflow: 'Write', name: 'Create record' },
			{ type: 'workflow', workflow: 'Write', name: 'Update record' },
		],
	} satisfies AgentJsonConfig;
	const updates = hitlConfigurationUpdates(current, configuration, ['tool:workflow:Update record']);
	expect(updates.tools?.[0]).toBe(current.tools[0]);
	expect(updates.tools?.[1]).toEqual({
		...current.tools[1],
		requireApproval: true,
		approvalRoute: route,
	});
});
