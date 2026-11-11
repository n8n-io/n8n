import { ESLint, type Linter } from 'eslint';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { templates } from '.';
import type { config as EslintConfig } from '../../configs/eslint';
import type { TemplateWithRun } from '../core';

type TemplateCase = {
	label: string;
	template: TemplateWithRun;
	/** Relative path of a file that must be linted, so that the test cannot pass on zero files. */
	expectedFile: string;
};

// TODO(CE-3900): add the other templates when they pass lint.
const cases: TemplateCase[] = [
	{
		label: 'programmatic/example',
		template: templates.programmatic.example,
		expectedFile: 'nodes/Example/Example.node.ts',
	},
];

// A generated project has no node_modules until the author runs `npm install`,
// so imports such as `n8n-workflow` cannot resolve in this test.
const testOnlyConfig: Linter.Config = {
	files: ['**/*.ts'],
	rules: { 'import-x/no-unresolved': 'off' },
};

async function generateProject(template: TemplateWithRun, destinationPath: string) {
	await template.run({
		destinationPath,
		nodePackageName: 'n8n-nodes-acme',
		user: { name: 'Test User', email: 'test@example.com' },
		packageManager: { name: 'npm', installCommand: 'npm install' },
		config: {},
	});

	// The template leaves these placeholders on purpose. Authors must replace them before they publish.
	const packageJsonPath = path.join(destinationPath, 'package.json');
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as {
		description: string;
		homepage: string;
		repository: { url: string };
	};
	packageJson.description = 'Acme node for n8n';
	packageJson.homepage = 'https://example.com';
	packageJson.repository.url = 'https://github.com/example/n8n-nodes-acme.git';
	await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

async function lintProject(eslintConfig: typeof EslintConfig, projectPath: string) {
	const eslint = new ESLint({
		cwd: projectPath,
		overrideConfigFile: true,
		overrideConfig: [...eslintConfig, testOnlyConfig],
	});
	const results = await eslint.lintFiles(['.']);
	// Use '/' on all platforms, so that the paths match `expectedFile` also on Windows.
	const relativePath = (filePath: string) =>
		path.relative(projectPath, filePath).split(path.sep).join('/');

	return {
		lintedFiles: results.map((result) => relativePath(result.filePath)),
		errors: results.flatMap((result) =>
			result.messages
				.filter((message) => message.severity === 2)
				.map(
					(message) =>
						`${relativePath(result.filePath)}:${message.line} ${message.ruleId}: ${message.message}`,
				),
		),
	};
}

describe('Generated templates', () => {
	let eslintConfig: typeof EslintConfig;
	let tempDir: string;

	beforeAll(async () => {
		// eslint-plugin-n8n-nodes-base reads NODE_ENV once when it loads. If the value is 'test',
		// the plugin uses a fake file name for every file. Vitest sets that value, so remove it
		// before the first import of the plugin to lint like a real project.
		vi.stubEnv('NODE_ENV', undefined);
		({ config: eslintConfig } = await import('../../configs/eslint.js'));
	});

	afterAll(() => {
		vi.unstubAllEnvs();
	});

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n8n-node-cli-template-lint-'));
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it.each(cases)(
		'$label passes the lint of the generated project',
		async ({ template, expectedFile }) => {
			await generateProject(template, tempDir);

			const { lintedFiles, errors } = await lintProject(eslintConfig, tempDir);

			expect(lintedFiles).toContain(expectedFile);
			expect(errors).toEqual([]);
		},
	);
});
