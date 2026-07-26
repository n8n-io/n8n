import { lintJsCode } from './code-node-js-lint';
import { lintPythonCode } from './code-node-python-lint';
import {
	lintWorkflowSdkSource,
	lintWorkflowSource,
	prepareSourceForLint,
} from './lint-workflow-source';

describe('lintWorkflowSdkSource', () => {
	it('flags statements after export default', () => {
		const source = `
import { workflow, node, trigger, ifElse } from '@n8n/workflow-sdk';
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const branch = ifElse({ version: 2.2, config: { name: 'Check', parameters: {} } });
const yes = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Yes' } });
export default workflow('id', 'name').add(start).to(branch);
branch.onTrue(yes);
`;
		const codes = lintWorkflowSdkSource(source).map((i) => i.code);
		expect(codes).toContain('SDK_CODE_AFTER_EXPORT_DEFAULT');
		expect(lintWorkflowSdkSource(source).every((i) => i.lintTarget === 'sdk')).toBe(true);
	});

	it('flags repeated onFalse overwrites', () => {
		const issues = lintWorkflowSdkSource(`
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const a = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
const b = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });
const c = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'C' } });
const branch = ifElse({ version: 2.2, config: { name: 'Check', parameters: {} } });
branch.onFalse(b);
branch.onFalse(c);
export default workflow('id', 'name').add(start).to(branch).onTrue(a);
`);
		expect(issues.map((i) => i.code)).toContain('SDK_REPEATED_BRANCH_WIRING');
	});

	it('flags as const', () => {
		const source = `
const mode = 'list' as const;
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_AS_CONST');
	});

	it('flags placeholder wrapped in expr', () => {
		const source = `
const n = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch', parameters: { url: expr(placeholder('API URL')) } },
});
export default workflow('id', 'name').add(n);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_PLACEHOLDER_WRAPPED');
	});

	it('flags sticky() calls', () => {
		const source = `
const note = sticky('## Notes');
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
export default workflow('id', 'name').add(start).add(note);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_UNSOLICITED_STICKY');
	});

	it('flags .map() in builder code', () => {
		const source = `
const names = ['a', 'b'].map((x) => x);
export default workflow('id', 'name').add(start);
`;
		const codes = lintWorkflowSdkSource(source).map((i) => i.code);
		expect(codes).toContain('SDK_FORBIDDEN_CONSTRUCT');
	});

	it('does not flag .map inside jsCode template literals', () => {
		const source = `
const transform = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Transform',
    parameters: {
      jsCode: \`
return $input.all().map(item => ({ json: item.json }));
\`.trim(),
    },
  },
});
export default workflow('id', 'name').add(transform);
`;
		const sdkMapIssues = lintWorkflowSdkSource(source).filter((i) =>
			i.message.includes("'.map()'"),
		);
		expect(sdkMapIssues).toHaveLength(0);
	});

	it('does not flag .map inside expr string literals', () => {
		const source = `
const n = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Set',
    parameters: { values: { string: [{ name: 'x', value: expr('={{ $json.items.map(i => i) }}') }] } },
  },
});
export default workflow('id', 'name').add(n);
`;
		const mapIssues = lintWorkflowSdkSource(source).filter((i) => i.message.includes("'.map()'"));
		expect(mapIssues).toHaveLength(0);
	});
});

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

describe('lintJsCode', () => {
	it('flags fetch in jsCode', () => {
		expect(lintJsCode('await fetch("https://example.com");').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});
});

describe('lintPythonCode', () => {
	it('flags requests in pythonCode', () => {
		expect(lintPythonCode('import requests').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});
});

describe('prepareSourceForLint', () => {
	it('strips imports', () => {
		const source = `
import { workflow } from '@n8n/workflow-sdk';
export default workflow('id', 'name');
`;
		const prepared = prepareSourceForLint(source);
		expect(prepared.code.includes('import')).toBe(false);
	});
});
