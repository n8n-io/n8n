import { lintWorkflowSource, prepareSourceForLint } from './source-lint';

describe('source-lint re-exports', () => {
	it('re-exports lintWorkflowSource', () => {
		const source = `
const mode = 'list' as const;
export default workflow('id', 'name').add(start);
`;
		expect(lintWorkflowSource(source).map((i) => i.code)).toContain('SDK_AS_CONST');
	});

	it('re-exports prepareSourceForLint', () => {
		expect(prepareSourceForLint('import { workflow } from "x";').code.includes('import')).toBe(
			false,
		);
	});
});
