import { lintWorkflowSource, prepareSourceForLint } from './source-lint';

describe('lintWorkflowSource', () => {
	it('flags statements after export default', () => {
		const source = `
import { workflow, node, trigger, ifElse } from '@n8n/workflow-sdk';
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
const branch = ifElse({ version: 2.2, config: { name: 'Check', parameters: {} } });
const yes = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Yes' } });
export default workflow('id', 'name').add(start).to(branch);
branch.onTrue(yes);
`;
		const codes = lintWorkflowSource(source).map((i) => i.code);
		expect(codes).toContain('SDK_CODE_AFTER_EXPORT_DEFAULT');
	});

	it('flags repeated onFalse overwrites', () => {
		const source = `
const branch = ifElse({ version: 2.2, config: { name: 'Check', parameters: {} } });
export default workflow('id', 'name')
  .add(start)
  .to(branch)
  .onTrue(a)
  .onFalse(b)
  .onFalse(c);
`;
		// May fail parse without full defs — if parse works, expect repeated wiring
		const prepared = prepareSourceForLint(source);
		expect(prepared.code.includes('import')).toBe(false);
		const issues = lintWorkflowSource(`
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
		expect(lintWorkflowSource(source).map((i) => i.code)).toContain('SDK_AS_CONST');
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
		expect(lintWorkflowSource(source).map((i) => i.code)).toContain('SDK_PLACEHOLDER_WRAPPED');
	});

	it('flags .map() in builder code', () => {
		const source = `
const names = ['a', 'b'].map((x) => x);
export default workflow('id', 'name').add(start);
`;
		const codes = lintWorkflowSource(source).map((i) => i.code);
		expect(codes).toContain('SDK_FORBIDDEN_CONSTRUCT');
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
		const mapIssues = lintWorkflowSource(source).filter((i) => i.message.includes("'.map()'"));
		expect(mapIssues).toHaveLength(0);
	});
});
