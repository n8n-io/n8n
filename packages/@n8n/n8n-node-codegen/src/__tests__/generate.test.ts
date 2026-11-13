import { generate } from '../generate';
import { findRepoRoot, n8nNodeConfig } from '../n8n-node.config';

describe('generate', () => {
	it('should find no errors in the committed spec and overrides', async () => {
		const { report, errors } = await generate(n8nNodeConfig(findRepoRoot(process.cwd())));

		expect(report).toMatch(/^Operations: [1-9]\d*\./m);
		expect(errors).toEqual([]);
	}, 60_000);
});
