import * as nodeModule from 'node:module';

import { REPORT_PATH, SECRETS_MANIFEST_PATH } from '../contracts';
import { PROGRESS_TOOL_NAME } from '../event-translation';
import { harnessAssetFiles } from '../harness-assets';

// Available since Node 22.13, but not yet declared by the pinned @types/node.
const { stripTypeScriptTypes } = nodeModule as unknown as {
	stripTypeScriptTypes: (source: string, options?: { mode?: 'strip' | 'transform' }) => string;
};

const EXTENSION_PATHS = [
	'.pi/extensions/n8n-guardrails.ts',
	'.pi/extensions/n8n-list-credentials.ts',
	'.pi/extensions/n8n-report-result.ts',
	'.pi/extensions/n8n-report-progress.ts',
	'.pi/extensions/n8n-lookup-docs.ts',
];

describe('harnessAssetFiles', () => {
	it('contains exactly the expected sandbox files', () => {
		expect(Object.keys(harnessAssetFiles).sort()).toEqual(
			['.pi/SYSTEM.md', 'AGENTS.md', ...EXTENSION_PATHS].sort(),
		);
	});

	it('has non-empty content for every file', () => {
		for (const [assetPath, content] of Object.entries(harnessAssetFiles)) {
			expect(content.length, assetPath).toBeGreaterThan(0);
		}
	});

	it('embeds the contract paths, so extensions and docs agree with the host', () => {
		expect(harnessAssetFiles['.pi/extensions/n8n-guardrails.ts']).toContain(
			`'${SECRETS_MANIFEST_PATH}'`,
		);
		expect(harnessAssetFiles['.pi/extensions/n8n-list-credentials.ts']).toContain(
			`'${SECRETS_MANIFEST_PATH}'`,
		);
		expect(harnessAssetFiles['.pi/extensions/n8n-report-result.ts']).toContain(`'${REPORT_PATH}'`);
		expect(harnessAssetFiles['AGENTS.md']).toContain(SECRETS_MANIFEST_PATH);
		expect(harnessAssetFiles['AGENTS.md']).toContain(REPORT_PATH);
		expect(harnessAssetFiles['.pi/SYSTEM.md']).toContain(REPORT_PATH);
	});

	it('instructs the harness on the core rules', () => {
		const systemMd = harnessAssetFiles['.pi/SYSTEM.md'];
		expect(systemMd).toContain('report_result');
		expect(systemMd).toContain('read-back');
		expect(systemMd).toContain('Never fabricate success');
	});

	describe.each(EXTENSION_PATHS)('%s', (extensionPath) => {
		const source = harnessAssetFiles[extensionPath];

		it('is syntactically valid TypeScript for the jiti loader', () => {
			// The repo pins the TS 7 native preview, which exposes no transpile
			// API; Node's type-stripper throws on any syntax error, which is the
			// proof we need before pi's jiti loader ever sees the file.
			const stripped = stripTypeScriptTypes(source, { mode: 'strip' });
			expect(stripped.length).toBeGreaterThan(0);
		});

		it('default-exports an extension factory (pi extension entry point)', () => {
			expect(source).toContain('export default function');
		});

		it('only imports node built-ins and modules pi bundles for extensions', () => {
			// Extensions run under pi's jiti loader inside the sandbox: workspace
			// modules and arbitrary npm packages do not exist there.
			const specifiers = [...source.matchAll(/^import[^'"]+['"]([^'"]+)['"];?$/gm)].map(
				(match) => match[1],
			);
			for (const specifier of specifiers) {
				expect(specifier, `${extensionPath} imports ${specifier}`).toMatch(
					/^(node:|typebox$|@earendil-works\/)/,
				);
			}
		});

		it('contains no leftover template interpolation artifacts', () => {
			expect(source).not.toContain('undefined/');
			expect(source).not.toContain('[object Object]');
		});
	});

	it('registers the expected custom tools', () => {
		expect(harnessAssetFiles['.pi/extensions/n8n-list-credentials.ts']).toContain(
			"name: 'list_credentials'",
		);
		expect(harnessAssetFiles['.pi/extensions/n8n-report-result.ts']).toContain(
			"name: 'report_result'",
		);
		expect(harnessAssetFiles['.pi/extensions/n8n-lookup-docs.ts']).toContain("name: 'lookup_docs'");
	});

	it('registers the progress tool under the name the event translation watches', () => {
		const progressExtension = harnessAssetFiles['.pi/extensions/n8n-report-progress.ts'];
		// PROGRESS_TOOL_NAME is the host-side contract: tool_execution_start
		// events for this tool become `status` lines with the `message` arg.
		expect(progressExtension).toContain(`name: '${PROGRESS_TOOL_NAME}'`);
		expect(progressExtension).toContain('message: Type.String(');
	});

	it('instructs the harness to report milestones without secrets', () => {
		expect(harnessAssetFiles['.pi/SYSTEM.md']).toContain('report_progress');
		expect(harnessAssetFiles['AGENTS.md']).toContain('report_progress');
	});

	it('hooks tool_call and tool_result in the guardrails extension', () => {
		const guardrails = harnessAssetFiles['.pi/extensions/n8n-guardrails.ts'];
		expect(guardrails).toContain("pi.on('tool_call'");
		expect(guardrails).toContain("pi.on('tool_result'");
	});
});
