import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Plugin } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { tscDecoratorTransform } from './tsc-decorator-transform.js';

describe('tscDecoratorTransform', () => {
	let projectDir: string;

	beforeEach(() => {
		projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-vitest-config-'));
		fs.mkdirSync(path.join(projectDir, 'src', 'entities'), { recursive: true });
		fs.writeFileSync(
			path.join(projectDir, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
				include: ['src/**/*.ts'],
			}),
		);
		fs.writeFileSync(path.join(projectDir, 'src', 'types.ts'), "export type Kind = 'one' | 'two';");
	});

	afterEach(() => {
		fs.rmSync(projectDir, { recursive: true });
	});

	it('transforms files in an entity directory', async () => {
		const entityFile = path.join(projectDir, 'src', 'entities', 'example.ts');
		writeDecoratedClass(entityFile, '../types');
		const plugin = tscDecoratorTransform({ projectDir, entityDirectories: ['src/entities'] });

		const result = await runTransform(plugin, entityFile);

		expect(result).toBeDefined();
		expect(getCode(result)).toContain('__metadata("design:type", String)');
	});

	it('transforms files that match a file predicate', async () => {
		const configFile = path.join(projectDir, 'src', 'example.config.ts');
		const otherFile = path.join(projectDir, 'src', 'example.ts');
		writeDecoratedClass(configFile);
		writeDecoratedClass(otherFile);
		const plugin = tscDecoratorTransform({
			projectDir,
			filePredicate: (fileName) => /\.config\.ts$/.test(fileName),
		});

		expect(await runTransform(plugin, otherFile)).toBeNull();
		expect(getCode(await runTransform(plugin, configFile))).toContain(
			'__metadata("design:type", String)',
		);
	});
});

function writeDecoratedClass(fileName: string, typesImport = './types') {
	fs.writeFileSync(
		fileName,
		[
			`import type { Kind } from '${typesImport}';`,
			'const Decorator = (): PropertyDecorator => () => {};',
			'class Example {',
			'  @Decorator()',
			'  value!: Kind;',
			'}',
		].join('\n'),
	);
}

async function runTransform(plugin: Plugin, fileName: string) {
	if (typeof plugin.transform !== 'function') throw new Error('Expected a transform hook');

	return await plugin.transform.call({} as never, '', fileName);
}

function getCode(result: Awaited<ReturnType<typeof runTransform>>) {
	if (!result || typeof result === 'string' || !('code' in result)) {
		throw new Error('Expected transformed code');
	}

	return result.code;
}
