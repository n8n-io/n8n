import { getReferencedAgentId, isDynamicAgentReference } from '../agentNode';

describe('agent node reference', () => {
	const expression = { __rl: true, mode: 'id', value: "={{ $('Trigger').item.json.assignee.id }}" };

	it('returns the id of a selected agent', () => {
		const param = { __rl: true, mode: 'list', value: 'agent-1' };

		expect(getReferencedAgentId(param)).toBe('agent-1');
		expect(isDynamicAgentReference(param)).toBe(false);
	});

	it('returns no id for an expression, because it resolves at run time', () => {
		expect(getReferencedAgentId(expression)).toBe('');
		expect(isDynamicAgentReference(expression)).toBe(true);
	});

	it('returns no id for a missing or empty parameter', () => {
		expect(getReferencedAgentId(undefined)).toBe('');
		expect(getReferencedAgentId({ __rl: true, mode: 'list', value: '' })).toBe('');
	});
});
