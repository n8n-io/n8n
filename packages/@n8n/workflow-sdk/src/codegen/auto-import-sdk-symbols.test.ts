import { autoImportMissingSdkSymbols } from './auto-import-sdk-symbols';

describe('autoImportMissingSdkSymbols', () => {
	it('adds missing symbols to an existing SDK import', () => {
		const source =
			"import {\n  workflow,\n  node,\n} from '@n8n/workflow-sdk';\n\nexport default workflow('id', 'n');";
		const result = autoImportMissingSdkSymbols(source, [
			'ReferenceError: expr is not defined',
			'nodeJson is not defined',
		]);

		expect(result?.symbols.sort()).toEqual(['expr', 'nodeJson']);
		expect(result?.source).toContain('expr,');
		expect(result?.source).toContain('nodeJson,');
		expect(result?.source).toContain('workflow,');
	});

	it('prepends an import when none exists', () => {
		const result = autoImportMissingSdkSymbols('export default workflow();', [
			'workflow is not defined',
		]);

		expect(result?.source.startsWith("import { workflow } from '@n8n/workflow-sdk';")).toBe(true);
	});

	it('ignores unknown symbols and unrelated errors', () => {
		expect(
			autoImportMissingSdkSymbols('code', ['myHelper is not defined', 'Unexpected token']),
		).toBeUndefined();
	});
});
