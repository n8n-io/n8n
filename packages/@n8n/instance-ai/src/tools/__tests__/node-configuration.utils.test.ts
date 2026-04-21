import type {
	NodeConfigurationEntry,
	NodeConfigurationsMap,
	TemplateNode,
	WorkflowMetadata,
} from '../templates/types';
import {
	addNodeConfigurationToMap,
	collectNodeConfigurationsFromWorkflows,
	collectSingleNodeConfiguration,
	formatNodeConfigurationExamples,
	getNodeConfigurationsFromTemplates,
} from '../utils/node-configuration.utils';

describe('node-configuration.utils', () => {
	function makeNode(
		name: string,
		type: string,
		parameters: Record<string, unknown> = {},
		typeVersion = 1,
	): TemplateNode {
		return { name, type, typeVersion, position: [0, 0], parameters };
	}

	function makeWorkflow(nodes: TemplateNode[]): WorkflowMetadata {
		return {
			templateId: 1,
			name: 'Test',
			workflow: { nodes, connections: {} },
		};
	}

	describe('collectSingleNodeConfiguration', () => {
		it('should return config for node with parameters', () => {
			const node = makeNode('Slack', 'n8n-nodes-base.slack', { channel: '#general' }, 2);
			const result = collectSingleNodeConfiguration(node);

			expect(result).toEqual({
				version: 2,
				parameters: { channel: '#general' },
			});
		});

		it('should return null for node with empty parameters', () => {
			const node = makeNode('Set', 'n8n-nodes-base.set', {});
			const result = collectSingleNodeConfiguration(node);

			expect(result).toBeNull();
		});

		it('should return null for node with oversized parameters', () => {
			const hugeValue = 'x'.repeat(20000);
			const node = makeNode('BigNode', 'n8n-nodes-base.code', { code: hugeValue });
			const result = collectSingleNodeConfiguration(node);

			expect(result).toBeNull();
		});
	});

	describe('addNodeConfigurationToMap', () => {
		it('should create new entry in map for new node type', () => {
			const map: NodeConfigurationsMap = {};
			const config: NodeConfigurationEntry = { version: 1, parameters: { key: 'value' } };

			addNodeConfigurationToMap('n8n-nodes-base.slack', config, map);

			expect(map['n8n-nodes-base.slack']).toHaveLength(1);
			expect(map['n8n-nodes-base.slack'][0]).toBe(config);
		});

		it('should append to existing entries for known node type', () => {
			const map: NodeConfigurationsMap = {
				'n8n-nodes-base.slack': [{ version: 1, parameters: { old: true } }],
			};
			const config: NodeConfigurationEntry = { version: 2, parameters: { new: true } };

			addNodeConfigurationToMap('n8n-nodes-base.slack', config, map);

			expect(map['n8n-nodes-base.slack']).toHaveLength(2);
		});
	});

	describe('collectNodeConfigurationsFromWorkflows', () => {
		it('should collect configurations from multiple workflows', () => {
			const workflows: WorkflowMetadata[] = [
				makeWorkflow([
					makeNode('Slack', 'n8n-nodes-base.slack', { channel: '#a' }),
					makeNode('HTTP', 'n8n-nodes-base.httpRequest', { url: 'https://example.com' }),
				]),
				makeWorkflow([makeNode('Slack 2', 'n8n-nodes-base.slack', { channel: '#b' })]),
			];

			const result = collectNodeConfigurationsFromWorkflows(workflows);

			expect(Object.keys(result)).toEqual(
				expect.arrayContaining(['n8n-nodes-base.slack', 'n8n-nodes-base.httpRequest']),
			);
			expect(result['n8n-nodes-base.slack']).toHaveLength(2);
			expect(result['n8n-nodes-base.httpRequest']).toHaveLength(1);
		});

		it('should skip sticky note nodes', () => {
			const workflows: WorkflowMetadata[] = [
				makeWorkflow([
					makeNode('Sticky', 'n8n-nodes-base.stickyNote', { content: 'note' }),
					makeNode('Slack', 'n8n-nodes-base.slack', { channel: '#a' }),
				]),
			];

			const result = collectNodeConfigurationsFromWorkflows(workflows);

			expect(result['n8n-nodes-base.stickyNote']).toBeUndefined();
			expect(result['n8n-nodes-base.slack']).toHaveLength(1);
		});

		it('should skip nodes with no parameters', () => {
			const workflows: WorkflowMetadata[] = [
				makeWorkflow([makeNode('Empty', 'n8n-nodes-base.noOp', {})]),
			];

			const result = collectNodeConfigurationsFromWorkflows(workflows);

			expect(Object.keys(result)).toHaveLength(0);
		});
	});

	describe('getNodeConfigurationsFromTemplates', () => {
		it('should filter by node type', () => {
			const templates: WorkflowMetadata[] = [
				makeWorkflow([
					makeNode('Slack', 'n8n-nodes-base.slack', { channel: '#a' }),
					makeNode('HTTP', 'n8n-nodes-base.httpRequest', { url: 'https://example.com' }),
				]),
			];

			const result = getNodeConfigurationsFromTemplates(templates, 'n8n-nodes-base.slack');

			expect(result).toHaveLength(1);
			expect(result[0].parameters).toEqual({ channel: '#a' });
		});

		it('should filter by node type and version', () => {
			const templates: WorkflowMetadata[] = [
				makeWorkflow([
					makeNode('Slack v1', 'n8n-nodes-base.slack', { channel: '#a' }, 1),
					makeNode('Slack v2', 'n8n-nodes-base.slack', { channel: '#b' }, 2),
				]),
			];

			const result = getNodeConfigurationsFromTemplates(templates, 'n8n-nodes-base.slack', 2);

			expect(result).toHaveLength(1);
			expect(result[0].version).toBe(2);
		});

		it('should return empty array when no matches found', () => {
			const templates: WorkflowMetadata[] = [
				makeWorkflow([makeNode('Slack', 'n8n-nodes-base.slack', { channel: '#a' })]),
			];

			const result = getNodeConfigurationsFromTemplates(templates, 'n8n-nodes-base.telegram');

			expect(result).toHaveLength(0);
		});
	});

	describe('formatNodeConfigurationExamples', () => {
		it('should format configurations as markdown', () => {
			const configs: NodeConfigurationEntry[] = [
				{ version: 2, parameters: { channel: '#general', text: 'Hello' } },
			];

			const result = formatNodeConfigurationExamples('n8n-nodes-base.slack', configs);

			expect(result).toContain('## Node Configuration Examples: n8n-nodes-base.slack');
			expect(result).toContain('### Example (version 2)');
			expect(result).toContain('```json');
			expect(result).toContain('#general');
		});

		it('should return "No examples found" for empty configurations', () => {
			const result = formatNodeConfigurationExamples('n8n-nodes-base.slack', []);

			expect(result).toContain('No examples found');
		});

		it('should filter by version when specified', () => {
			const configs: NodeConfigurationEntry[] = [
				{ version: 1, parameters: { old: true } },
				{ version: 2, parameters: { new: true } },
			];

			const result = formatNodeConfigurationExamples('n8n-nodes-base.slack', configs, 2);

			expect(result).toContain('version 2');
			expect(result).not.toContain('version 1');
		});

		it('should limit number of examples', () => {
			const configs: NodeConfigurationEntry[] = [
				{ version: 1, parameters: { a: 1 } },
				{ version: 1, parameters: { b: 2 } },
				{ version: 1, parameters: { c: 3 } },
			];

			const result = formatNodeConfigurationExamples('n8n-nodes-base.slack', configs, undefined, 2);

			const exampleCount = (result.match(/### Example/g) ?? []).length;
			expect(exampleCount).toBeLessThanOrEqual(2);
		});
	});
});
