import type { INodePropertyCollection, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { AgentV3 } from '../V3/AgentV3.node';

describe('Agent V3 parameter schema', () => {
	it.each([3, 3.1])('exposes optional Tool Availability rules in version %s', (version) => {
		const { description } = new AgentV3(mock<INodeTypeBaseDescription>());
		expect(description.version).toContain(version);
		const parameter = description.properties.find(({ name }) => name === 'toolAvailability');

		expect(parameter).toMatchObject({
			displayName: 'Tool Availability',
			type: 'fixedCollection',
			default: {},
			typeOptions: { multipleValues: true },
		});
		expect(parameter?.required).not.toBe(true);
		expect(parameter?.displayOptions).toBeUndefined();
		const rules = parameter?.options?.[0] as INodePropertyCollection;
		expect(rules.name).toBe('rules');
		expect(rules.values).toHaveLength(2);
		expect(rules.values[0]).toMatchObject({
			name: 'sourceNodeId',
			type: 'options',
			noDataExpression: true,
			typeOptions: { loadOptionsFromConnectedNodes: NodeConnectionTypes.AiTool },
		});
		expect(rules.values[1]).toMatchObject({
			displayName: 'Available',
			name: 'available',
			type: 'boolean',
			default: true,
		});
		expect(rules.values[1].noDataExpression).not.toBe(true);
	});
});
