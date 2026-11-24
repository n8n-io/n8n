import { extractEmbeddedCodeSnippetsFromSource } from './extract-snippets';

describe('extractEmbeddedCodeSnippetsFromSource', () => {
	it('extracts jsCode from a Code node config', () => {
		const source = `
const transform = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Transform',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: 'return $input.all();',
    },
  },
});
export default workflow('id', 'name').add(transform);
`;
		const snippets = extractEmbeddedCodeSnippetsFromSource(source);
		expect(snippets).toEqual([
			expect.objectContaining({
				parameter: 'jsCode',
				code: 'return $input.all();',
				mode: 'runOnceForEachItem',
			}),
		]);
	});

	it('extracts pythonCode from a Code node config', () => {
		const source = `
const transform = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Transform',
    parameters: {
      language: 'pythonNative',
      pythonCode: 'import requests',
    },
  },
});
export default workflow('id', 'name').add(transform);
`;
		expect(extractEmbeddedCodeSnippetsFromSource(source)).toEqual([
			expect.objectContaining({
				parameter: 'pythonCode',
				code: 'import requests',
			}),
		]);
	});
});
