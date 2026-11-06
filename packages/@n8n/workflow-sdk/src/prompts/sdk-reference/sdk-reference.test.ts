import { SDK_IMPORT_STATEMENT, getSdkReferenceContent } from './sdk-reference';
import * as sdk from '../../index';

describe('SDK_IMPORT_STATEMENT', () => {
	it('imports only functions that the package exports', () => {
		const names = /\{([^}]+)\}/.exec(SDK_IMPORT_STATEMENT)?.[1].split(',') ?? [];

		expect(names.length).toBeGreaterThan(0);
		for (const name of names.map((n) => n.trim())) {
			expect(sdk, `'${name}' is not exported by @n8n/workflow-sdk`).toHaveProperty(name);
		}
	});
});

describe('getSdkReferenceContent', () => {
	it('starts the full reference with the import statement', () => {
		const content = getSdkReferenceContent();

		expect(content.startsWith('# n8n Workflow SDK Reference\n\n## SDK Import Statement')).toBe(
			true,
		);
		expect(content).toContain(SDK_IMPORT_STATEMENT);
	});

	it('returns the full reference for "all" and for no section', () => {
		expect(getSdkReferenceContent('all')).toBe(getSdkReferenceContent());
	});
});
