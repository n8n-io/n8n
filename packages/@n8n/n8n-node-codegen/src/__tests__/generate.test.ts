import { generate } from '../generate';
import { N8N_NODE_CONFIG } from '../n8n-node.config';

describe('generate', () => {
	it('should find no errors in the committed spec and overrides', async () => {
		const { report, errors } = await generate(N8N_NODE_CONFIG);

		expect(report).toMatch(/^Operations: [1-9]\d*\./m);
		expect(errors).toEqual([]);
	}, 60_000);
});
