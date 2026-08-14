import { lintWorkflowSource } from './lint-workflow-source';

describe('lintWorkflowSource embedded code', () => {
	it('lints jsCode separately from SDK rules', () => {
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
		const issues = lintWorkflowSource(source);
		expect(issues.some((i) => i.lintTarget === 'sdk' && i.message.includes("'.map()'"))).toBe(
			false,
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					lintTarget: 'jsCode',
					code: 'CODE_MODE_API_MISUSE',
				}),
			]),
		);
	});

	it('lints pythonCode separately', () => {
		const source = `
const transform = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Transform',
    parameters: {
      language: 'pythonNative',
      pythonCode: 'import requests\\nrequests.get("https://example.com")',
    },
  },
});
export default workflow('id', 'name').add(transform);
`;
		const issues = lintWorkflowSource(source);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					lintTarget: 'pythonCode',
					code: 'CODE_NODE_NETWORK_CALL',
				}),
			]),
		);
		expect(issues.every((i) => i.lintTarget !== 'sdk' || !i.message.includes('requests'))).toBe(
			true,
		);
	});
});
