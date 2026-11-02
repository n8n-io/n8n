import type { INode } from 'n8n-workflow';

import { skipTimeBasedWaits } from '../skip-time-based-waits';

function waitNode(name: string, parameters: INode['parameters'], disabled = false): INode {
	return {
		id: name,
		name,
		type: 'n8n-nodes-base.wait',
		typeVersion: 1.1,
		position: [0, 0],
		parameters,
		...(disabled ? { disabled } : {}),
	};
}

describe('skipTimeBasedWaits', () => {
	it('sets a time-interval wait to zero seconds', () => {
		const { nodes, skippedNodeNames } = skipTimeBasedWaits([
			waitNode('Wait Before Retry', { resume: 'timeInterval', amount: 15, unit: 'seconds' }),
		]);

		expect(nodes[0].parameters).toEqual({ resume: 'timeInterval', amount: 0, unit: 'seconds' });
		expect(skippedNodeNames).toEqual(['Wait Before Retry']);
	});

	it('treats a wait without a resume parameter as a time interval', () => {
		const { nodes, skippedNodeNames } = skipTimeBasedWaits([waitNode('Wait', {})]);

		expect(nodes[0].parameters).toMatchObject({ amount: 0, unit: 'seconds' });
		expect(skippedNodeNames).toEqual(['Wait']);
	});

	it('turns a specific-time wait into a zero-second interval', () => {
		const { nodes, skippedNodeNames } = skipTimeBasedWaits([
			waitNode('Wait Until Monday', { resume: 'specificTime', dateTime: '2099-01-01T00:00:00Z' }),
		]);

		expect(nodes[0].parameters).toMatchObject({
			resume: 'timeInterval',
			amount: 0,
			unit: 'seconds',
		});
		expect(skippedNodeNames).toEqual(['Wait Until Monday']);
	});

	it.each(['webhook', 'form'])('keeps a wait that resumes on %s', (resume) => {
		const node = waitNode('Wait For Reply', { resume });

		const { nodes, skippedNodeNames } = skipTimeBasedWaits([node]);

		expect(nodes[0]).toBe(node);
		expect(skippedNodeNames).toEqual([]);
	});

	it('keeps disabled waits and other node types', () => {
		const disabled = waitNode('Old Wait', { amount: 10, unit: 'minutes' }, true);
		const set: INode = {
			id: 'set',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 3,
			position: [0, 0],
			parameters: { amount: 10 },
		};

		const { nodes, skippedNodeNames } = skipTimeBasedWaits([disabled, set]);

		expect(nodes).toEqual([disabled, set]);
		expect(skippedNodeNames).toEqual([]);
	});

	it('does not change the input nodes', () => {
		const node = waitNode('Wait', { resume: 'timeInterval', amount: 5, unit: 'minutes' });

		skipTimeBasedWaits([node]);

		expect(node.parameters).toEqual({ resume: 'timeInterval', amount: 5, unit: 'minutes' });
	});
});
