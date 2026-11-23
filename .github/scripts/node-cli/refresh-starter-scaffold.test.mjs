import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	MANIFEST_PATH,
	applySync,
	compareApiVersion,
	findTriggerNodes,
	mergePackageJson,
	planSync,
	readManifest,
	templateAvailable,
	triggerVerdict,
	writeManifest,
} from './refresh-starter-scaffold.mjs';

let tmp;

/** Create files from a `{ 'relative/path': 'content' }` map under `root`. */
function writeTree(root, files) {
	for (const [rel, content] of Object.entries(files)) {
		const file = path.join(root, rel);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, content);
	}
	return root;
}

const generated = (name, files) => ({
	template: name,
	root: writeTree(fs.mkdtempSync(path.join(tmp, `${name.replace('/', '-')}-`)), files),
});

const starter = (files = {}) => writeTree(fs.mkdtempSync(path.join(tmp, 'starter-')), files);

const exists = (root, rel) => fs.existsSync(path.join(root, rel));

beforeEach(() => {
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-starter-test-'));
});

afterEach(() => {
	fs.rmSync(tmp, { recursive: true, force: true });
});

describe('planSync', () => {
	it('writes generated files and skips the denylist and .git', () => {
		const plan = planSync({
			generated: [
				generated('programmatic/example', {
					'nodes/Example/Example.node.ts': 'node',
					'README.md': 'readme',
					'CHANGELOG.md': 'log',
					'package.json': '{}',
					'.git/HEAD': 'ref',
					'.gitignore': 'dist',
				}),
			],
			previousFiles: [],
		});

		assert.deepEqual([...plan.writes.keys()], ['.gitignore', 'nodes/Example/Example.node.ts']);
		assert.deepEqual(plan.deletes, []);
		assert.deepEqual(plan.conflicts, []);
	});

	it('deletes files that were in the manifest but are no longer generated', () => {
		const plan = planSync({
			generated: [generated('programmatic/example', { 'nodes/Example/Example.node.ts': 'node' })],
			previousFiles: ['nodes/Example/Example.node.ts', 'nodes/Old/Old.node.ts'],
		});

		assert.deepEqual(plan.deletes, ['nodes/Old/Old.node.ts']);
	});

	it('never deletes protected files, even when a stale manifest lists them', () => {
		const plan = planSync({
			generated: [generated('programmatic/example', { 'tsconfig.json': '{}' })],
			previousFiles: [
				'README_TEMPLATE.md',
				'.github/workflows/ci-cla-check.yml',
				'.github/scaffold-manifest.json',
				'package-lock.json',
				'.git/config',
			],
		});

		assert.deepEqual(plan.deletes, []);
	});

	it('does not delete without a previous manifest', () => {
		const plan = planSync({
			generated: [generated('programmatic/example', { 'tsconfig.json': '{}' })],
			previousFiles: [],
		});

		assert.deepEqual(plan.deletes, []);
	});

	it('unions files from several templates into one directory', () => {
		const plan = planSync({
			generated: [
				generated('declarative/github-issues', {
					'credentials/GithubIssuesApi.credentials.ts': 'a',
					'tsconfig.json': 'same',
				}),
				generated('declarative/webhook-trigger', {
					'credentials/ExampleApi.credentials.ts': 'b',
					'tsconfig.json': 'same',
				}),
			],
			previousFiles: [],
		});

		assert.deepEqual([...plan.writes.keys()].sort(), [
			'credentials/ExampleApi.credentials.ts',
			'credentials/GithubIssuesApi.credentials.ts',
			'tsconfig.json',
		]);
		assert.deepEqual(plan.conflicts, []);
	});

	it('reports a conflict when two templates emit different bytes for one path', () => {
		const plan = planSync({
			generated: [
				generated('declarative/github-issues', { 'credentials/ExampleApi.credentials.ts': 'a' }),
				generated('declarative/webhook-trigger', { 'credentials/ExampleApi.credentials.ts': 'b' }),
			],
			previousFiles: [],
		});

		assert.deepEqual(plan.conflicts, [
			{
				path: 'credentials/ExampleApi.credentials.ts',
				templates: ['declarative/github-issues', 'declarative/webhook-trigger'],
			},
		]);
	});
});

describe('applySync', () => {
	it('copies writes, removes deletes, and prunes empty directories', () => {
		const root = starter({
			'nodes/Old/Old.node.ts': 'old',
			'nodes/Old/Old.node.json': 'old',
			'README.md': 'keep',
			'.vscode/extensions.json': 'keep',
		});
		const plan = planSync({
			generated: [generated('programmatic/example', { 'nodes/Example/Example.node.ts': 'new' })],
			previousFiles: ['nodes/Old/Old.node.ts', 'nodes/Old/Old.node.json'],
		});

		applySync(root, plan);

		assert.equal(fs.readFileSync(path.join(root, 'nodes/Example/Example.node.ts'), 'utf8'), 'new');
		assert.equal(exists(root, 'nodes/Old'), false);
		assert.equal(exists(root, 'nodes'), true);
		assert.equal(exists(root, 'README.md'), true);
		assert.equal(exists(root, '.vscode/extensions.json'), true);
	});

	it('is a no-op on a second run with the same input', () => {
		const root = starter();
		const gen = generated('programmatic/example', { 'nodes/Example/Example.node.ts': 'new' });
		const first = planSync({ generated: [gen], previousFiles: [] });
		applySync(root, first);
		writeManifest(root, {
			cliVersion: '1.0.0',
			templates: ['programmatic/example'],
			files: [...first.writes.keys()],
		});

		const second = planSync({ generated: [gen], previousFiles: readManifest(root).files });
		applySync(root, second);

		assert.deepEqual([...second.writes.keys()], [...first.writes.keys()]);
		assert.deepEqual(second.deletes, []);
		assert.equal(fs.readFileSync(path.join(root, 'nodes/Example/Example.node.ts'), 'utf8'), 'new');
	});
});

describe('mergePackageJson', () => {
	const starterPkg = {
		name: 'n8n-nodes-<...>',
		version: '0.1.0',
		author: { name: 'Jane' },
		scripts: { build: 'old' },
		n8n: {
			n8nNodesApiVersion: 1,
			strict: true,
			credentials: ['dist/credentials/B.js'],
			nodes: ['dist/nodes/B/B.node.js'],
		},
		devDependencies: { '@n8n/node-cli': '*', eslint: '9.39.4' },
		peerDependencies: { 'n8n-workflow': '*' },
	};
	const examplePkg = {
		name: 'n8n-nodes-example',
		scripts: { build: 'n8n-node build', lint: 'n8n-node lint' },
		files: ['dist'],
		keywords: ['n8n-community-node-package'],
		n8n: {
			n8nNodesApiVersion: 1,
			strict: true,
			credentials: [],
			nodes: ['dist/nodes/Example/Example.node.js'],
		},
		devDependencies: { '@n8n/node-cli': '*', eslint: '9.32.0', prettier: '3.6.2' },
		peerDependencies: { 'n8n-workflow': '*' },
	};
	const triggerPkg = {
		...examplePkg,
		n8n: {
			n8nNodesApiVersion: '3.1',
			strict: true,
			credentials: ['dist/credentials/ExampleApi.credentials.js'],
			nodes: ['dist/nodes/ExampleWebhookTrigger/ExampleWebhookTrigger.node.js'],
		},
	};

	it('replaces scripts and unions the n8n manifest, sorted and deduped', () => {
		const out = mergePackageJson(starterPkg, [examplePkg, triggerPkg]);

		assert.deepEqual(out.scripts, { build: 'n8n-node build', lint: 'n8n-node lint' });
		assert.deepEqual(out.n8n.nodes, [
			'dist/nodes/Example/Example.node.js',
			'dist/nodes/ExampleWebhookTrigger/ExampleWebhookTrigger.node.js',
		]);
		assert.deepEqual(out.n8n.credentials, ['dist/credentials/ExampleApi.credentials.js']);
		assert.deepEqual(out.files, ['dist']);
		assert.deepEqual(out.keywords, ['n8n-community-node-package']);
	});

	it('keeps identity fields and key order', () => {
		const out = mergePackageJson(starterPkg, [examplePkg]);

		assert.equal(out.name, 'n8n-nodes-<...>');
		assert.equal(out.version, '0.1.0');
		assert.deepEqual(out.author, { name: 'Jane' });
		assert.deepEqual(Object.keys(out).slice(0, 4), ['name', 'version', 'author', 'scripts']);
	});

	it('takes the highest n8nNodesApiVersion and keeps its type', () => {
		assert.equal(mergePackageJson(starterPkg, [examplePkg]).n8n.n8nNodesApiVersion, 1);
		assert.equal(
			mergePackageJson(starterPkg, [examplePkg, triggerPkg]).n8n.n8nNodesApiVersion,
			'3.1',
		);
	});

	it('adds missing dependencies but never changes an existing pin', () => {
		const out = mergePackageJson(starterPkg, [examplePkg]);

		assert.equal(out.devDependencies.eslint, '9.39.4');
		assert.equal(out.devDependencies.prettier, '3.6.2');
		assert.equal(out.peerDependencies['n8n-workflow'], '*');
	});

	it('rejects templates that disagree on a script', () => {
		const other = { ...examplePkg, scripts: { build: 'something else' } };

		assert.throws(() => mergePackageJson(starterPkg, [examplePkg, other]), /scripts\.build/);
	});
});

describe('compareApiVersion', () => {
	it('orders numerically per segment', () => {
		assert.ok(compareApiVersion('3.1', 1) > 0);
		assert.ok(compareApiVersion('3.10', '3.9') > 0);
		assert.equal(compareApiVersion('3.1', '3.1'), 0);
		assert.ok(compareApiVersion(1, '1.0') === 0);
	});
});

describe('findTriggerNodes', () => {
	it('finds nodes that declare the trigger group, in any quote style', () => {
		const root = starter({
			'nodes/A/A.node.ts': "group: ['trigger'],",
			'nodes/B/B.node.ts': 'group: [ "trigger" ],',
			'nodes/C/C.node.ts': "group: ['transform'],",
			'nodes/E/E.node.ts': "group: ['trigger', 'schedule'],",
			'nodes/D/D.node.json': "group: ['trigger']",
			'credentials/X.credentials.ts': "group: ['trigger']",
		});

		assert.deepEqual(findTriggerNodes(root), [
			'nodes/A/A.node.ts',
			'nodes/B/B.node.ts',
			'nodes/E/E.node.ts',
		]);
	});

	it('returns nothing without a nodes directory', () => {
		assert.deepEqual(findTriggerNodes(starter()), []);
	});
});

describe('triggerVerdict', () => {
	it('is a notice when a trigger exists', () => {
		assert.equal(
			triggerVerdict({ triggerNodes: ['nodes/A/A.node.ts'], triggerTemplateGenerated: true }).level,
			'notice',
		);
	});

	it('is an error when the trigger template ran but produced no trigger', () => {
		assert.equal(
			triggerVerdict({ triggerNodes: [], triggerTemplateGenerated: true }).level,
			'error',
		);
	});

	it('is a warning while the CLI has no trigger template', () => {
		assert.equal(
			triggerVerdict({ triggerNodes: [], triggerTemplateGenerated: false }).level,
			'warning',
		);
	});
});

describe('manifest', () => {
	it('round-trips through the starter checkout', () => {
		const root = starter();
		writeManifest(root, {
			cliVersion: '0.57.4',
			templates: ['programmatic/example'],
			files: ['b', 'a'],
		});

		assert.equal(exists(root, MANIFEST_PATH), true);
		assert.deepEqual(readManifest(root), {
			cliVersion: '0.57.4',
			templates: ['programmatic/example'],
			files: ['b', 'a'],
		});
		assert.equal(readManifest(starter()), null);
	});
});

describe('templateAvailable', () => {
	it('looks for the template package.json in the published layout', () => {
		const cli = writeTree(fs.mkdtempSync(path.join(tmp, 'cli-')), {
			'dist/template/templates/declarative/github-issues/template/package.json': '{}',
		});

		assert.equal(templateAvailable(cli, 'declarative/github-issues'), true);
		assert.equal(templateAvailable(cli, 'declarative/webhook-trigger'), false);
	});
});
