import { NodeConnectionTypes, isINodePropertyCollection } from 'n8n-workflow';

import { Agent } from '../Agent.node';

describe.each([3, 3.1])('Agent V%s parameter schema', (version) => {
	it('offers optional tool availability rules with a source-ID selector and Boolean expression', () => {
		const agent = new Agent().getNodeType(version);
		const availability = agent.description.properties.find(
			({ name }) => name === 'toolAvailability',
		);
		expect(availability).toMatchObject({
			displayName: 'Tool Availability',
			type: 'fixedCollection',
			default: {},
			typeOptions: { multipleValues: true },
		});
		expect(availability?.required).not.toBe(true);
		const rules = availability?.options?.find(isINodePropertyCollection);
		expect(rules?.values).toEqual([
			expect.objectContaining({
				name: 'sourceNodeId',
				type: 'options',
				noDataExpression: true,
				typeOptions: { connectedNodeOptions: NodeConnectionTypes.AiTool },
			}),
			expect.objectContaining({
				displayName: 'Available',
				name: 'available',
				type: 'boolean',
				default: true,
			}),
		]);
		expect(rules?.values.find(({ name }) => name === 'available')?.noDataExpression).not.toBe(true);
	});
});
