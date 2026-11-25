import { generate } from '../generate';
import { N8N_NODE_CONFIG } from '../n8n-node.config';

describe('generate', () => {
	it('should generate the node properties from the committed spec and overrides', async () => {
		const { report, errors, content } = await generate(N8N_NODE_CONFIG);

		expect(report).toMatch(/^Operations: [1-9]\d*\./m);
		expect(errors).toEqual([]);
		expect(content).toContain('export const properties: INodeProperties[] = ');
	}, 60_000);
});
