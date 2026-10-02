import * as flowSdk from '@n8n/workflow-sdk/next';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { derivedNodeTypes, mattermostDescription } from './derived-node-types';
import {
	derivedActionIds,
	derivedActionsNamedBy,
	derivedModulePath,
	derivedNodeModuleText,
	derivedNodeView,
	derivedReadOf,
	hasDerivedModule,
	nodeTypeOfModulePath,
} from '../next-modules';

const MATTERMOST = 'n8n-nodes-base.mattermost';

const TSC = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');

/** Runs `tsc` on `source` with the derived Mattermost module at its import path. */
function typeErrors(source: string, module: string): string[] {
	const root = mkdtempSync(path.join(tmpdir(), 'next-derived-modules-'));
	try {
		mkdirSync(path.join(root, 'nodes', 'n8n-nodes-base'), { recursive: true });
		writeFileSync(path.join(root, 'nodes', 'n8n-nodes-base', 'mattermost.ts'), module);
		writeFileSync(path.join(root, 'workflow.ts'), source);
		const sdk = require.resolve('@n8n/workflow-sdk/next').replace(/\.js$/, '.d.ts');
		const compilerOptions = {
			strict: true,
			noEmit: true,
			skipLibCheck: true,
			target: 'ES2022',
			module: 'ES2022',
			moduleResolution: 'bundler',
			types: [],
			paths: { '@n8n/nodes/*': ['./nodes/*'], '@n8n/workflow-sdk/next': [sdk] },
		};
		writeFileSync(
			path.join(root, 'tsconfig.json'),
			JSON.stringify({ compilerOptions, files: ['workflow.ts'] }),
		);
		try {
			execFileSync(process.execPath, [TSC, '-p', root, '--pretty', 'false'], { encoding: 'utf8' });
			return [];
		} catch (error) {
			const output = (error as { stdout?: string }).stdout ?? String(error);
			return output
				.split('\n')
				.filter((line) => line.includes('error TS'))
				.map((line) => line.replace(/^.*?([\w.-]+\.ts)\((\d+),\d+\): /, '$1:$2 '));
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

describe('derived node modules', () => {
	it.each([
		['n8n-nodes-base.mattermost', 'n8n-nodes-base/mattermost'],
		['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain/openAi'],
	])('imports %s from @n8n/nodes/%s', (nodeType, modulePath) => {
		expect(derivedModulePath(nodeType)).toBe(modulePath);
		expect(nodeTypeOfModulePath(modulePath)).toBe(nodeType);
	});

	it('reads a typed module id as no derived module path', () => {
		expect(nodeTypeOfModulePath('notion')).toBeUndefined();
	});

	it('derives the module of a node type without a typed module, once per instance', () => {
		const nodeTypesProvider = derivedNodeTypes();
		const source = { nodeTypesProvider };
		const text = derivedNodeModuleText(MATTERMOST, source);

		expect(text).toContain('// Derived from n8n-nodes-base.mattermost version 2.3.');
		expect(text).toContain(
			'contractStep("n8n-nodes-base.mattermost", config, 2.3, {"resource":"message","operation":"post"})',
		);
		expect(text).toContain('export const mattermost = {');
		expect(derivedNodeModuleText(MATTERMOST, source)).toBe(text);
		expect(nodeTypesProvider.getByNameAndVersion).toHaveBeenCalledTimes(1);
	});

	it.each([
		['a typed module', 'n8n-nodes-base.notion'],
		['an SDK step', 'n8n-nodes-base.filter'],
		['an unknown node type', 'n8n-nodes-base.unknown'],
	])('derives no module for %s', (_case, nodeType) => {
		const name = nodeType === 'n8n-nodes-base.unknown' ? 'mattermost' : nodeType.split('.')[1];
		const nodeTypesProvider = derivedNodeTypes([{ ...mattermostDescription, name: name ?? '' }]);
		expect(hasDerivedModule(nodeType, { nodeTypesProvider })).toBe(false);
	});

	it('derives no module without the node types of an instance', () => {
		expect(hasDerivedModule(MATTERMOST, {})).toBe(false);
	});

	it('types the output from the __schema__ lookup of the instance', () => {
		const outputSchemaLookup = vi.fn(() => ({
			type: 'object',
			properties: { id: { type: 'string' }, message: { type: 'string' } },
		}));
		const text = derivedNodeModuleText(MATTERMOST, {
			nodeTypesProvider: derivedNodeTypes(),
			outputSchemaLookup,
		});

		expect(outputSchemaLookup).toHaveBeenCalledWith({
			type: MATTERMOST,
			typeVersion: 2.3,
			resource: 'message',
			operation: 'post',
		});
		expect(text).toContain(
			'export type MattermostMessagePostOutput = { id: string; message: string; [key: string]: any };',
		);
	});

	it('types at most three actions in a view and lists the others in one line each', () => {
		const source = { nodeTypesProvider: derivedNodeTypes() };
		const view = derivedNodeView(MATTERMOST, source);

		expect(view?.node).toBe(MATTERMOST);
		expect(view?.import).toBe("import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';");
		expect(view?.module.match(/contractStep\(/g)).toHaveLength(3);
		expect(view?.module).toContain(
			'// mattermost.channel.archive(config: MattermostChannelArchiveInput) — archive (write, per-item)',
		);
	});

	it('types the actions that a resource and an operation or the query name', () => {
		const source = { nodeTypesProvider: derivedNodeTypes() };
		const shown = derivedActionIds(MATTERMOST, source, {
			resource: 'channel',
			operation: 'archive',
		});

		expect(shown).toEqual(['mattermost.channel.archive']);
		expect(
			derivedNodeView(MATTERMOST, source, new Set(shown))?.module.match(/contractStep\(/g),
		).toHaveLength(1);
		expect(derivedActionsNamedBy(MATTERMOST, source, 'mattermost delete a message')).toEqual([
			'mattermost.message.delete',
		]);
		expect(derivedActionsNamedBy(MATTERMOST, source, 'mattermost')).toEqual([]);
	});

	it('builds the legacy node of its version with the slot and __rl on the locator value', () => {
		const text = derivedNodeModuleText(MATTERMOST, { nodeTypesProvider: derivedNodeTypes() }) ?? '';
		// The factory of mattermost.message.post, as the module text calls the flow SDK.
		const [, type = '', version = '', slot = '{}'] =
			/contractStep\("([^"]+)", config, ([\d.]+), (\{"resource":"message","operation":"post"\})\)/.exec(
				text,
			) ?? [];
		const config = {
			name: 'Post' as const,
			channelId: { mode: 'id', value: 'c1' },
			message: (item: { text: string }) => item.text,
		};
		const step = flowSdk.contractStep(
			type,
			config,
			Number(version),
			JSON.parse(slot) as { resource: string; operation: string },
		);
		const json = flowSdk.workflow('Post', flowSdk.manual().andThen(step)).toJSON();

		expect(json.nodes.find((node) => node.name === 'Post')).toMatchObject({
			type: MATTERMOST,
			typeVersion: 2.3,
			parameters: {
				resource: 'message',
				operation: 'post',
				channelId: { __rl: true, mode: 'id', value: 'c1' },
				message: '={{ $json.text }}',
			},
		});
	});

	it('reads a saved node as its derived factory and input, or gives the reason', () => {
		const source = { nodeTypesProvider: derivedNodeTypes() };
		const saved = (typeVersion: number, parameters: Record<string, unknown>) =>
			derivedReadOf({ type: MATTERMOST, typeVersion, parameters }, source);

		expect(
			saved(2.3, {
				resource: 'message',
				operation: 'post',
				channelId: { __rl: true, mode: 'id', value: 'c1' },
				message: '={{ $json.text }}',
			}),
		).toEqual({
			factory: {
				module: 'mattermost',
				from: '@n8n/nodes/n8n-nodes-base/mattermost',
				path: 'message.post',
				version: 2.3,
				inputKeys: ['channelId', 'message'],
				expressionKeys: ['message'],
			},
			parameters: { channelId: { mode: 'id', value: 'c1' }, message: '={{ $json.text }}' },
		});
		expect(saved(2.3, { resource: 'message', operation: 'update' })).toEqual({
			reason: 'no derived action runs message.update',
		});
		expect(
			derivedReadOf({ type: 'n8n-nodes-base.notion', typeVersion: 2 }, source),
		).toBeUndefined();
	});

	// Each case runs a real tsc.
	it('checks a workflow against the derived module with tsc', () => {
		const module =
			derivedNodeModuleText(MATTERMOST, { nodeTypesProvider: derivedNodeTypes() }) ?? '';
		const header = [
			"import { manual, workflow } from '@n8n/workflow-sdk/next';",
			"import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';",
			'',
		].join('\n');
		const post = (fields: string) =>
			`${header}export default workflow('Post', manual().andThen(mattermost.message.post({ name: 'Post', ${fields} })));\n`;

		expect(
			typeErrors(post("channelId: { mode: 'id', value: 'c1' }, message: 'Hi'"), module),
		).toEqual([]);
		expect(
			typeErrors(post("channelId: { mode: 'name', value: 'c1' }, message: 'Hi'"), module),
		).toEqual([
			expect.stringContaining('workflow.ts:3 error TS2322: Type \'"name"\' is not assignable'),
		]);
		expect(typeErrors(post("channelId: { mode: 'id', value: 'c1' }"), module)).toEqual([
			expect.stringContaining('workflow.ts:3 error TS2345'),
		]);
	});
});
