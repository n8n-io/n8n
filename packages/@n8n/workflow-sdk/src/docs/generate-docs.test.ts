import {
	BEST_PRACTICES_PATH,
	QUICK_START_EXAMPLE,
	README_PATH,
	readDocs,
	renderBestPractices,
	renderDocs,
	renderReadme,
} from './generate-docs';
import { parseWorkflowCodeToBuilder, validateWorkflowBuilder } from '../index';
import { bestPracticesRegistry } from '../prompts/best-practices';
import { GROUPING_GUIDANCE, getSdkReferenceContent } from '../prompts/sdk-reference';

// npmjs.com shows the README from the registry metadata, which npm cuts at 64 KiB.
const NPM_README_LIMIT_BYTES = 64 * 1024;

describe('generated docs', () => {
	it('match the committed files', () => {
		const committed = readDocs();
		for (const [file, content] of Object.entries(renderDocs())) {
			expect(committed[file], `${file} is out of date. Run \`pnpm generate:docs\`.`).toBe(content);
		}
	});

	it('embed the full reference that the MCP tool serves', () => {
		expect(renderReadme()).toContain(getSdkReferenceContent());
	});

	it('keep the README under the npm display limit', () => {
		const readme = renderReadme({ version: '100.100.100' });
		expect(Buffer.byteLength(readme, 'utf-8')).toBeLessThan(NPM_README_LIMIT_BYTES);
	});

	it('include the grouping guidance and every best-practices guide', () => {
		const bestPractices = renderBestPractices();
		expect(bestPractices).toContain(GROUPING_GUIDANCE);
		for (const guide of Object.values(bestPracticesRegistry)) {
			if (guide) expect(bestPractices).toContain(guide.getDocumentation());
		}
	});

	it('state the package version when the version is set', () => {
		const docs = renderDocs({ version: '1.2.3' });

		expect(docs[README_PATH]).toContain('**Version:** `@n8n/workflow-sdk@1.2.3`');
		expect(docs[README_PATH]).toContain(
			'https://unpkg.com/@n8n/workflow-sdk@1.2.3/docs/best-practices.md',
		);
		expect(docs[BEST_PRACTICES_PATH]).toContain('**Version:** `@n8n/workflow-sdk@1.2.3`');
		expect(docs[BEST_PRACTICES_PATH]).toContain(
			'https://unpkg.com/@n8n/workflow-sdk@1.2.3/README.md',
		);
	});

	it('show a quick start example that parses and validates', () => {
		// The interpreter rejects import declarations, as the README states.
		const code = QUICK_START_EXAMPLE.replace(/^import .+;\n/, '');
		const builder = parseWorkflowCodeToBuilder(code);
		const result = validateWorkflowBuilder(builder, { source: code, lint: true });

		expect(result.issues).toEqual([]);
		expect(builder.toJSON().nodes.map((n) => n.name)).toEqual([
			'Start',
			'Fetch Posts',
			'Format Title',
		]);
	});
});
