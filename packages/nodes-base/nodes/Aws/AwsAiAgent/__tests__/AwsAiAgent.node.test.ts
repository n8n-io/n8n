import { AwsAiAgent } from '../AwsAiAgent.node';

describe('AWS AI Agent node — description', () => {
	const node = new AwsAiAgent();

	it('has the expected identity', () => {
		expect(node.description.displayName).toBe('AWS AI Agent');
		expect(node.description.name).toBe('awsAiAgent');
		expect(node.description.icon).toBe('file:bedrock.svg');
		expect(node.description.version).toBe(1);
	});

	it('is an action node with one main input and output', () => {
		expect(node.description.inputs).toEqual(['main']);
		expect(node.description.outputs).toEqual(['main']);
		expect(node.description.properties.some((p) => p.name === 'input')).toBe(true);
	});
});
