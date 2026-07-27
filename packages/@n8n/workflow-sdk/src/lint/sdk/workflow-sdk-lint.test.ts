import { lintWorkflowSdkSource, prepareSourceForLint } from './workflow-sdk-lint';

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

	it('flags repeated onFalse overwrites on the same IF identifier', () => {
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

	it('does not flag fluent onTrue/onFalse across different IF nodes on the workflow chain', () => {
		const source = `
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const a = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
const b = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });
const c = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'C' } });
const d = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'D' } });
const if1 = ifElse({ version: 2.2, config: { name: 'Check1', parameters: {} } });
const if2 = ifElse({ version: 2.2, config: { name: 'Check2', parameters: {} } });
export default workflow('id', 'name')
  .add(start)
  .to(if1)
  .onTrue(a)
  .onFalse(b)
  .to(if2)
  .onTrue(c)
  .onFalse(d);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain(
			'SDK_REPEATED_BRANCH_WIRING',
		);
	});

	it('flags as const', () => {
		const source = `
const mode = 'list' as const;
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_AS_CONST');
	});

	it('does not flag as const inside jsCode template literals', () => {
		const source = `
const transform = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Transform',
    parameters: {
      jsCode: \`
// cast the value as const before returning
return $input.all();
\`.trim(),
    },
  },
});
export default workflow('id', 'name').add(transform);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain('SDK_AS_CONST');
	});

	it('does not flag as const inside string literals', () => {
		const source = `
const note = 'avoid as const in workflow files';
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain('SDK_AS_CONST');
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

	it('does not flag JSON.stringify in builder code', () => {
		const source = `
const payload = JSON.stringify({ a: 1 });
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).not.toContain(
			'SDK_FORBIDDEN_CONSTRUCT',
		);
	});

	it('still flags raw JSON identifier access', () => {
		const source = `
const payload = JSON;
export default workflow('id', 'name').add(start);
`;
		const issue = lintWorkflowSdkSource(source).find((i) => i.code === 'SDK_FORBIDDEN_CONSTRUCT');
		expect(issue).toMatchObject({ line: 2, column: 17 });
	});

	it('reports 1-based column for as const', () => {
		const source = `const mode = 'list' as const;\nexport default workflow('id', 'name');\n`;
		const issue = lintWorkflowSdkSource(source).find((i) => i.code === 'SDK_AS_CONST');
		// prepareSourceForLint records 0-based column 20; issues expose 1-based 21.
		expect(issue).toMatchObject({ line: 1, column: 21 });
	});

	it('still flags JSON.parse', () => {
		const source = `
const payload = JSON.parse('{"x":42}');
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSdkSource(source).map((i) => i.code)).toContain('SDK_FORBIDDEN_CONSTRUCT');
	});
});

describe('prepareSourceForLint', () => {
	it('strips imports while preserving line numbers for later statements', () => {
		const source = `import {
  workflow,
  node,
} from '@n8n/workflow-sdk';
const mode = 'list' as const;
export default workflow('id', 'name');
`;
		const prepared = prepareSourceForLint(source);
		expect(prepared.code.includes('import')).toBe(false);
		expect(prepared.asConstMatches).toEqual([{ line: 5, column: 20 }]);
		const asConstLine = prepared.code.split(/\r?\n/)[4];
		expect(asConstLine).toContain("const mode = 'list'");
	});

	it('does not mangle ternaries when stripping type annotations', () => {
		const source = `
const value = flag ? 'a' : 'b';
export default workflow('id', 'name');
`;
		const prepared = prepareSourceForLint(source);
		expect(prepared.code).toContain("flag ? 'a' : 'b'");
	});
});
