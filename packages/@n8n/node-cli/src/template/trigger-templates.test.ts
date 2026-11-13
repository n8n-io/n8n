import { ESLint } from 'eslint';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

import { pollingTriggerTemplate } from './templates/declarative/polling-trigger/template';
import { webhookTriggerTemplate } from './templates/declarative/webhook-trigger/template';
import { config } from '../configs/eslint';
import { tmpdirTest } from '../test-utils/temp-fs';

// eslint-plugin-n8n-nodes-base reads NODE_ENV on load. In a test run, it ignores the real file names.
vi.hoisted(() => vi.stubEnv('NODE_ENV', 'development'));

// A published `n8n-workflow` can lack the declarative trigger types, so use the workspace one.
const nodeCliNodeModules = path.resolve(__dirname, '../../node_modules');

function typecheck(projectDir: string): string {
	const host: ts.ParseConfigFileHost = {
		...ts.sys,
		onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
			throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
		},
	};
	// The generated tsconfig is for TypeScript 5. The TypeScript 6 JS API rejects its deprecated options without this flag.
	const parsed = ts.getParsedCommandLineOfConfigFile(
		path.join(projectDir, 'tsconfig.json'),
		{ noEmit: true, ignoreDeprecations: '6.0' },
		host,
	);
	if (!parsed) throw new Error('Could not read tsconfig.json');

	const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
	const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
	return ts.formatDiagnostics(diagnostics, {
		getCanonicalFileName: (fileName) => fileName,
		getCurrentDirectory: () => projectDir,
		getNewLine: () => '\n',
	});
}

async function lint(projectDir: string): Promise<string[]> {
	const eslint = new ESLint({ cwd: projectDir, overrideConfigFile: true, overrideConfig: config });
	const results = await eslint.lintFiles(['.']);
	return results.flatMap((result) =>
		result.messages.map(
			(message) =>
				`${path.relative(projectDir, result.filePath)}:${message.line} ${message.ruleId}: ${message.message}`,
		),
	);
}

describe('declarative trigger templates', () => {
	for (const [name, template, nodeName] of [
		['polling-trigger', pollingTriggerTemplate, 'ExamplePollingTrigger'],
		['webhook-trigger', webhookTriggerTemplate, 'ExampleWebhookTrigger'],
	] as const) {
		tmpdirTest(
			`${name} generates a package that compiles and passes lint`,
			async ({ tmpdir }) => {
				await template.run({
					destinationPath: tmpdir,
					nodePackageName: 'n8n-nodes-example',
					user: { name: 'Test User', email: 'test@example.com' },
					packageManager: { name: 'npm', installCommand: 'ci' },
					config: {},
				});
				await fs.symlink(nodeCliNodeModules, path.join(tmpdir, 'node_modules'), 'dir');

				const packageJsonPath = path.join(tmpdir, 'package.json');
				const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
				expect(packageJson.n8n).toEqual({
					n8nNodesApiVersion: '3.1',
					strict: true,
					credentials: ['dist/credentials/ExampleApi.credentials.js'],
					nodes: [`dist/nodes/${nodeName}/${nodeName}.node.js`],
				});

				expect(typecheck(tmpdir)).toBe('');

				// Fill the package.json placeholders, as a node builder does before the first release.
				packageJson.description = 'Example trigger';
				packageJson.homepage = 'https://example.com';
				packageJson.repository.url = 'https://github.com/org/n8n-nodes-example.git';
				await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

				expect(await lint(tmpdir)).toEqual([]);
			},
			60_000,
		);
	}
});
