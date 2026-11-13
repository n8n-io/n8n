/**
 * `wfc credentials`: builds the credentials file of spec section 7.
 *
 *   wfc credentials --export <file or dir> [--workflow <file.ts> | --module <file.wfm>]
 *       [--map <slot>=<credential name or id>]... [--nodes <package dir>]... -o <file>
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ExportedCredential, Slot } from './build.ts';
import {
	buildCredentialsFile,
	CredentialsToolError,
	formatReport,
	parseExport,
	parseMappings,
	slotsFromModule,
	slotsFromSource,
} from './build.ts';
import { loadCredentialTypes, registryOf } from './types.ts';

export const CREDENTIALS_USAGE =
	'  wfc credentials --export <file|dir> [--workflow <file.ts> | --module <file.wfm>]\n' +
	'      [--map <slot>=<credential name or id>]... [--nodes <node package dir>]... -o <file>\n';

interface Options {
	exports: string[];
	workflow?: string;
	module?: string;
	maps: string[];
	nodes: string[];
	out?: string;
}

function parseArgs(args: string[]): Options {
	const options: Options = { exports: [], maps: [], nodes: [] };
	for (let i = 0; i < args.length; i++) {
		const flag = args[i];
		const value = args[i + 1];
		if (value === undefined) throw new CredentialsToolError(`${flag} needs a value`);
		i++;
		if (flag === '--export') options.exports.push(value);
		else if (flag === '--workflow') options.workflow = value;
		else if (flag === '--module') options.module = value;
		else if (flag === '--map') options.maps.push(value);
		else if (flag === '--nodes') options.nodes.push(value);
		else if (flag === '-o' || flag === '--output') options.out = value;
		else throw new CredentialsToolError(`unknown option ${flag}`);
	}
	if (options.exports.length === 0) throw new CredentialsToolError('--export is required');
	if (!options.out) throw new CredentialsToolError('-o <file> is required');
	return options;
}

/** Reads an export file, or every `.json` file of a `--separate` export directory. */
function readExports(path: string): ExportedCredential[] {
	if (statSync(path).isDirectory()) {
		return readdirSync(path)
			.filter((f) => f.endsWith('.json'))
			.sort()
			.flatMap((f) => readExports(join(path, f)));
	}
	return parseExport(JSON.parse(readFileSync(path, 'utf8')), path);
}

/** Runs the command. It returns the process exit code. */
export function runCredentialsCommand(
	args: string[],
	io: { stderr: (text: string) => void } = { stderr: (t) => process.stderr.write(t) },
): number {
	try {
		const options = parseArgs(args);
		const exported = options.exports.flatMap(readExports);
		let slots: Slot[] = [];
		if (options.module) slots = slotsFromModule(new Uint8Array(readFileSync(options.module)));
		else if (options.workflow) {
			slots = slotsFromSource(readFileSync(options.workflow, 'utf8'), options.workflow);
		}
		const loaded = loadCredentialTypes(options.nodes.length > 0 ? options.nodes : undefined);
		if (loaded.types.length === 0) {
			throw new CredentialsToolError(
				'no credential types found. Build n8n-nodes-base, or give --nodes <package dir>.',
			);
		}
		const { file, report } = buildCredentialsFile({
			exported,
			slots,
			mappings: parseMappings(options.maps),
			registry: registryOf(loaded.types),
		});
		// The file holds secrets: only the owner can read it.
		writeFileSync(options.out ?? '', `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
		io.stderr(`${formatReport(report)}\nwrote ${options.out}\n`);
		const unsupported = report.filter((r) => r.kind === 'unsupported');
		for (const r of unsupported) {
			io.stderr(
				`warning: slot "${r.slot}" has no inject. Steps that use it run only in the fallback host.\n`,
			);
		}
		return 0;
	} catch (error) {
		if (error instanceof CredentialsToolError) {
			io.stderr(`wfc credentials: ${error.message}\nusage:\n${CREDENTIALS_USAGE}`);
			return 2;
		}
		throw error;
	}
}
