import { resolveLocalImports, stripImportStatements, stripSdkImports } from '../extract-code';

describe('stripImportStatements', () => {
	it('should strip all import statements', () => {
		const code = `import { workflow } from '@n8n/workflow-sdk';
import { foo } from './local';

const x = 1;`;
		expect(stripImportStatements(code)).toBe('const x = 1;');
	});
});

describe('stripSdkImports', () => {
	it('should strip only SDK imports and preserve local imports', () => {
		const code = `import { workflow, node } from '@n8n/workflow-sdk';
import { weatherNode } from '../chunks/weather';

const x = workflow('test', 'Test');`;
		const result = stripSdkImports(code);
		expect(result).toContain("import { weatherNode } from '../chunks/weather'");
		expect(result).not.toContain('@n8n/workflow-sdk');
		expect(result).toContain("const x = workflow('test', 'Test');");
	});
});

describe('resolveLocalImports', () => {
	function makeReadFile(files: Record<string, string>) {
		// eslint-disable-next-line @typescript-eslint/require-await
		return async (filePath: string): Promise<string | null> => {
			return files[filePath] ?? null;
		};
	}

	it('should return code unchanged when there are no local imports', async () => {
		const code = `import { workflow } from '@n8n/workflow-sdk';
const w = workflow('test', 'Test');`;
		const result = await resolveLocalImports(code, '/workspace/src', makeReadFile({}));
		expect(result).toContain("const w = workflow('test', 'Test');");
	});

	it('should resolve a single local import', async () => {
		const mainCode = `import { workflow } from '@n8n/workflow-sdk';
import { weatherNode } from '../chunks/weather';

export default workflow('test', 'Test').add(weatherNode);`;

		const chunkCode = `import { node, newCredential } from '@n8n/workflow-sdk';

export const weatherNode = node({
  type: 'n8n-nodes-base.openWeatherMap',
  version: 1,
  config: { name: 'Weather' }
});`;

		const readFile = makeReadFile({
			'/workspace/chunks/weather.ts': chunkCode,
		});

		const result = await resolveLocalImports(mainCode, '/workspace/src', readFile);

		// Chunk content should be inlined (without SDK import or export keyword)
		expect(result).toContain('const weatherNode = node({');
		expect(result).not.toContain('export const weatherNode');
		// Local import should be removed from main code
		expect(result).not.toContain("from '../chunks/weather'");
		// Main code should still have workflow reference
		expect(result).toContain("workflow('test', 'Test').add(weatherNode)");
	});

	it('should resolve multiple imports from different files', async () => {
		const mainCode = `import { workflow } from '@n8n/workflow-sdk';
import { weatherNode } from '../chunks/weather';
import { emailNode } from '../chunks/email';

export default workflow('test', 'Test').add(weatherNode).to(emailNode);`;

		const readFile = makeReadFile({
			'/workspace/chunks/weather.ts': `import { node } from '@n8n/workflow-sdk';
export const weatherNode = node({ type: 'weather', version: 1, config: {} });`,
			'/workspace/chunks/email.ts': `import { node } from '@n8n/workflow-sdk';
export const emailNode = node({ type: 'email', version: 1, config: {} });`,
		});

		const result = await resolveLocalImports(mainCode, '/workspace/src', readFile);

		expect(result).toContain("const weatherNode = node({ type: 'weather'");
		expect(result).toContain("const emailNode = node({ type: 'email'");
		expect(result).not.toContain("from '../chunks/weather'");
		expect(result).not.toContain("from '../chunks/email'");
	});

	it('should resolve nested imports (chunk importing another chunk)', async () => {
		const mainCode = `import { workflow } from '@n8n/workflow-sdk';
import { compositeNode } from '../chunks/composite';

export default workflow('test', 'Test').add(compositeNode);`;

		const readFile = makeReadFile({
			'/workspace/chunks/composite.ts': `import { node } from '@n8n/workflow-sdk';
import { helperNode } from './helper';

export const compositeNode = node({ type: 'composite', version: 1, config: {} });`,
			'/workspace/chunks/helper.ts': `import { node } from '@n8n/workflow-sdk';

export const helperNode = node({ type: 'helper', version: 1, config: {} });`,
		});

		const result = await resolveLocalImports(mainCode, '/workspace/src', readFile);

		expect(result).toContain("const helperNode = node({ type: 'helper'");
		expect(result).toContain("const compositeNode = node({ type: 'composite'");
	});

	it('should handle missing files gracefully', async () => {
		const mainCode = `import { workflow } from '@n8n/workflow-sdk';
import { missing } from '../chunks/nonexistent';

export default workflow('test', 'Test');`;

		const result = await resolveLocalImports(mainCode, '/workspace/src', makeReadFile({}));

		// Should not throw, just skip the missing import
		expect(result).toContain("workflow('test', 'Test')");
		// Local import line should still be removed
		expect(result).not.toContain("from '../chunks/nonexistent'");
	});

	it('should deduplicate imports referenced from multiple files', async () => {
		const mainCode = `import { workflow } from '@n8n/workflow-sdk';
import { a } from '../chunks/a';
import { b } from '../chunks/b';

export default workflow('test', 'Test');`;

		const readFile = makeReadFile({
			'/workspace/chunks/a.ts': `import { node } from '@n8n/workflow-sdk';
import { shared } from './shared';
export const a = node({ type: 'a', version: 1, config: {} });`,
			'/workspace/chunks/b.ts': `import { node } from '@n8n/workflow-sdk';
import { shared } from './shared';
export const b = node({ type: 'b', version: 1, config: {} });`,
			'/workspace/chunks/shared.ts': `import { node } from '@n8n/workflow-sdk';
export const shared = node({ type: 'shared', version: 1, config: {} });`,
		});

		const result = await resolveLocalImports(mainCode, '/workspace/src', readFile);

		// shared should appear exactly once
		const matches = result.match(/const shared = node/g);
		expect(matches).toHaveLength(1);
	});

	it('should add .ts extension when resolving import paths', async () => {
		const mainCode = `import { foo } from '../chunks/foo';
const x = foo;`;

		const readFile = makeReadFile({
			'/workspace/chunks/foo.ts': 'export const foo = 42;',
		});

		const result = await resolveLocalImports(mainCode, '/workspace/src', readFile);
		expect(result).toContain('const foo = 42;');
	});
});
