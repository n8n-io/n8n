#!/usr/bin/env node
/**
 * wfc: the workflow compiler command line.
 *
 *   wfc compile <file.ts> -o <dir>
 *   wfc disasm <file.wfm>
 *   wfc ref <file.ts> <fixture.json>
 *   wfc convert <workflow.json> [-o <file.ts>]
 *   wfc credentials --export <file> [--workflow <file.ts>] [--map <slot>=<name>] -o <file>
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { compile } from './compiler/index.ts';
import { decodeModule, disassemble } from './compiler/decode.ts';
import type { Diagnostic } from './compiler/validate.ts';
import type { Fixture } from './reference/runner.ts';
import { runReference } from './reference/runner.ts';

const nodeSha256 = (bytes: Uint8Array) =>
	new Uint8Array(createHash('sha256').update(bytes).digest());

function formatDiagnostic(d: Diagnostic, file: string): string {
	const where = d.file === '/workflow.ts' || d.file.endsWith(basename(file)) ? file : d.file;
	const hint = d.suggestion ? `\n  suggestion: ${d.suggestion}` : '';
	return `${where}:${d.line}:${d.column} ${d.code} ${d.message}${hint}`;
}

function usage(): never {
	process.stderr.write(
		'usage:\n  wfc compile <file.ts> -o <dir>\n  wfc disasm <file.wfm>\n  wfc ref <file.ts> <fixture.json>\n',
	);
	process.exit(2);
}

async function main(args: string[]) {
	const [command, ...rest] = args;
	if (command === 'convert') {
		const { runConvert } = await import('./convert/cli.ts');
		process.exitCode = runConvert(rest);
		return;
	}
	if (command === 'compile') {
		const file = rest[0];
		const oi = rest.indexOf('-o');
		const outDir = oi >= 0 ? rest[oi + 1] : '.';
		if (!file || !outDir) usage();
		const result = compile(readFileSync(file, 'utf8'), { fileName: file, hasher: nodeSha256 });
		if (!result.ok || !result.module) {
			for (const d of result.diagnostics) process.stderr.write(`${formatDiagnostic(d, file)}\n`);
			process.exit(1);
		}
		for (const d of result.warnings ?? []) {
			process.stderr.write(`warning: ${formatDiagnostic(d, file)}\n`);
		}
		const name = basename(file).replace(/\.ts$/, '');
		mkdirSync(outDir, { recursive: true });
		writeFileSync(join(outDir, `${name}.wfm`), result.module);
		writeFileSync(
			join(outDir, `${name}.canvas.json`),
			`${JSON.stringify(result.canvas, null, 2)}\n`,
		);
		writeFileSync(
			join(outDir, `${name}.sourcemap.json`),
			`${JSON.stringify(result.sourceMap, null, 2)}\n`,
		);
		writeFileSync(
			join(outDir, `${name}.manifest.json`),
			`${JSON.stringify(result.manifest, null, 2)}\n`,
		);
		process.stdout.write(`${join(outDir, `${name}.wfm`)} ${result.manifest?.moduleHash ?? ''}\n`);
		return;
	}
	if (command === 'disasm') {
		const file = rest[0];
		if (!file) usage();
		process.stdout.write(disassemble(decodeModule(new Uint8Array(readFileSync(file)))));
		return;
	}
	if (command === 'ref') {
		const [file, fixtureFile] = rest;
		if (!file || !fixtureFile) usage();
		const fixture: Fixture = JSON.parse(readFileSync(fixtureFile, 'utf8'));
		const out = await runReference(readFileSync(file, 'utf8'), fixture, { fileName: file });
		process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
		return;
	}
	if (command === 'credentials') {
		// Builds the credentials file (spec section 7). Loaded on use: it reads node packages.
		const { runCredentialsCommand } = await import('./credentials/command.ts');
		process.exit(runCredentialsCommand(rest));
	}
	usage();
}

await main(process.argv.slice(2));
