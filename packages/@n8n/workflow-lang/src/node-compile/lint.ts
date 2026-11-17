import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

import ts from 'typescript';

import { publicCredential } from '../credentials/public.ts';
import type { CredentialTypeInfo, CredentialTypeRegistry } from '../credentials/types.ts';
import {
	DEFAULT_NODE_PACKAGES,
	describeCredentialType,
	loadCredentialTypes,
	registryOf,
} from '../credentials/types.ts';
import type { NodeSources } from './convert.ts';
import { compileNodeInstance, nodeDescriptionOf, verifiedKey } from './convert.ts';
import type { NodeDiagnostic } from './diagnostics.ts';
import { diagnose, formatDiagnostic, shortPath } from './diagnostics.ts';
import { evaluateInSandbox } from './evaluate-node.ts';
import type { PublishFacts } from './specialise.ts';
import { VERIFIED } from './verified.generated.ts';
import type { Json, WalkNode } from './walk.ts';
import {
	credentialOf,
	fakeCredentialData,
	operationsOf,
	requiredParameters,
	resolveParameters,
} from './walk.ts';

export const LINT_NOTE =
	'"compiles" means that the node compiler accepts the operation with its required parameters set. It does not mean "proven equal to v1": an operation runs compiled only when it is also in the verified list, which is a separate gate (scripts/verify-compiled-nodes.ts). An operation that does not compile is not refused: it runs in the fallback host.';

const LINT_TIMEZONE = 'America/New_York';
const LINT_FACTS: PublishFacts = {
	workflow: { id: 'lint', active: false },
	instanceBaseUrl: 'http://localhost:5678',
};

export interface LintOperation {
	name: string;
	resource?: string;
	operation?: string;
	compiles: boolean;
	verified: boolean;
	diagnostics: NodeDiagnostic[];
}

export interface LintNodeReport {
	type: string;
	version: number;
	file: string;
	operations: LintOperation[];
	compiled: number;
	total: number;
}

export interface LintReport {
	nodes: LintNodeReport[];
	skipped: Array<{ file: string; reason: string }>;
	compiled: number;
	total: number;
	note: string;
}

export interface LintTarget {
	type: string;
	version: number;
	node: WalkNode;
	entry: string;
	sources: NodeSources;
	registry: CredentialTypeRegistry;
	verified?: Record<string, string[]>;
}

let signingKey: string | undefined;
function lintSigningKey(): string {
	signingKey ??= generateKeyPairSync('rsa', {
		modulusLength: 2048,
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
		publicKeyEncoding: { type: 'spki', format: 'pem' },
	}).privateKey;
	return signingKey;
}

function operationName(start: Json): string {
	const text = (v: unknown) => (typeof v === 'string' ? v : '');
	const name = [text(start.resource), text(start.operation)].filter((part) => part !== '');
	return name.length > 0 ? name.join('.') : '(default)';
}

export function lintTarget(target: LintTarget, only?: string): LintNodeReport {
	const { type, version, node, sources, registry } = target;
	const operations: LintOperation[] = [];
	for (const start of operationsOf(node)) {
		const name = operationName(start);
		if (only !== undefined && only !== name) continue;
		let result: ReturnType<typeof compileNodeInstance>;
		let parameters: Json = start;
		try {
			parameters = requiredParameters(node, version, start);
			const credential = credentialOf(node, resolveParameters(node, version, parameters));
			const fields = credential
				? {
						[credential]: publicCredential(
							registry.get(credential),
							fakeCredentialData(registry, credential, lintSigningKey),
						),
					}
				: {};
			result = compileNodeInstance(
				sources,
				{ type, version, parameters },
				null,
				fields,
				LINT_TIMEZONE,
				LINT_FACTS,
			);
		} catch (error) {
			result = { errors: [error instanceof Error ? error.message : String(error)] };
		}
		const failed = 'errors' in result;
		operations.push({
			name,
			...(typeof start.resource === 'string' ? { resource: start.resource } : {}),
			...(typeof start.operation === 'string' ? { operation: start.operation } : {}),
			compiles: !failed,
			verified:
				!failed &&
				(target.verified ?? VERIFIED)[verifiedKey(type, version, parameters)] !== undefined,
			diagnostics:
				'errors' in result
					? diagnose({
							errors: result.errors,
							origins: result.origins,
							entry: target.entry,
							readFile: sources.readFile,
						})
					: [],
		});
	}
	return {
		type,
		version,
		file: target.entry,
		operations,
		compiled: operations.filter((o) => o.compiles).length,
		total: operations.length,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFile(path: string): boolean {
	return existsSync(path) && statSync(path).isFile();
}

function packageRootOf(path: string): string | undefined {
	let dir = statSync(path).isDirectory() ? path : dirname(path);
	for (let depth = 0; depth < 32; depth++) {
		if (isFile(join(dir, 'package.json'))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
	return undefined;
}

function readPackage(root: string): Record<string, unknown> {
	const pkg: unknown = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
	return isRecord(pkg) ? pkg : {};
}

function listed(pkg: Record<string, unknown>, key: 'nodes' | 'credentials'): string[] {
	const n8n = pkg.n8n;
	const list = isRecord(n8n) ? n8n[key] : undefined;
	return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

function aliasesOf(root: string): Record<string, string> {
	const out: Record<string, string> = {};
	const file = join(root, 'tsconfig.json');
	if (!isFile(file)) return out;
	const config: unknown = ts.readConfigFile(file, (path) => readFileSync(path, 'utf8')).config;
	const options = isRecord(config) ? config.compilerOptions : undefined;
	const paths = isRecord(options) ? options.paths : undefined;
	const baseUrl = isRecord(options) && typeof options.baseUrl === 'string' ? options.baseUrl : '.';
	if (!isRecord(paths)) return out;
	for (const [pattern, targets] of Object.entries(paths)) {
		const to = Array.isArray(targets) ? targets[0] : undefined;
		if (!pattern.endsWith('/*') || typeof to !== 'string' || !to.endsWith('/*')) continue;
		out[pattern.slice(0, -1)] = `${resolve(root, baseUrl, to.slice(0, -2))}/`;
	}
	return out;
}

const MAX_SOURCE_FILES = 20_000;

function classFiles(
	dir: string,
	suffix: string,
	into: Map<string, string>,
	budget: { left: number },
) {
	if (!existsSync(dir)) return;
	for (const entry of readdirSync(dir)) {
		if (budget.left-- <= 0) return;
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (!/^(test|__tests__|__schema__|node_modules)$/.test(entry))
				classFiles(path, suffix, into, budget);
		} else if (entry.endsWith(suffix)) {
			for (const m of readFileSync(path, 'utf8').matchAll(/^(?:export )?class (\w+)/gm))
				if (!into.has(m[1])) into.set(m[1], path);
		}
	}
}

interface LoadedClass extends WalkNode {
	nodeVersions?: Record<string, LoadedClass>;
	constructor: { name: string };
	execute?: unknown;
}

function isLoadedClass(value: unknown): value is LoadedClass {
	if (!isRecord(value)) return false;
	if (isRecord(value.nodeVersions)) return true;
	return nodeDescriptionOf(value.description) !== undefined;
}

function instancesOf(load: NodeJS.Require, built: string): LoadedClass[] {
	const exported: unknown = load(built);
	const out: LoadedClass[] = [];
	for (const value of isRecord(exported) ? Object.values(exported) : []) {
		if (typeof value !== 'function') continue;
		try {
			const made: unknown = Reflect.construct(value, []);
			if (isLoadedClass(made)) out.push(made);
		} catch {
			continue;
		}
	}
	return out;
}

interface PackageModel {
	root: string;
	name: string;
	load: NodeJS.Require;
	aliases: Record<string, string>;
	registry: CredentialTypeRegistry;
	credentialEntry: (type: string) => string | undefined;
}

function packageModel(root: string): PackageModel {
	const pkg = readPackage(root);
	const load = createRequire(join(root, 'package.json'));
	const entries = new Map<string, string>();
	const own: CredentialTypeInfo[] = [];
	const knownFile = join(root, 'dist/known/credentials.json');
	const name = typeof pkg.name === 'string' ? pkg.name : root;
	if (isFile(knownFile)) {
		const known: unknown = JSON.parse(readFileSync(knownFile, 'utf8'));
		for (const [type, entry] of Object.entries(isRecord(known) ? known : {})) {
			if (isRecord(entry) && typeof entry.sourcePath === 'string')
				entries.set(type, join(root, entry.sourcePath));
		}
	} else {
		for (const path of listed(pkg, 'credentials')) {
			const built = join(root, path);
			if (!isFile(built)) continue;
			try {
				const exported: unknown = load(built);
				for (const value of isRecord(exported) ? Object.values(exported) : []) {
					if (typeof value !== 'function') continue;
					const info = describeCredentialType(Reflect.construct(value, []), name);
					own.push(info);
					entries.set(info.name, built);
				}
			} catch {
				continue;
			}
		}
	}
	const dirs = [root, ...DEFAULT_NODE_PACKAGES.filter((dir) => resolve(dir) !== resolve(root))];
	return {
		root,
		name,
		load,
		aliases: aliasesOf(root),
		registry: registryOf([...own, ...loadCredentialTypes(dirs).types]),
		credentialEntry: (type) => entries.get(type),
	};
}

function builtPathOf(root: string, path: string): string {
	const inside = relative(root, path);
	if (inside.startsWith('dist/') || path.endsWith('.js')) return path;
	return join(root, 'dist', inside.replace(/\.ts$/, '.js'));
}

function sourceDirOf(root: string, built: string): { dir: string; suffix: string } {
	const inside = relative(root, dirname(built));
	const source = inside.startsWith('dist/') ? join(root, inside.slice('dist/'.length)) : undefined;
	const hasSource =
		source !== undefined &&
		existsSync(source) &&
		readdirSync(source, { recursive: true }).some((entry) => String(entry).endsWith('.node.ts'));
	return hasSource && source !== undefined
		? { dir: source, suffix: '.node.ts' }
		: { dir: dirname(built), suffix: '.node.js' };
}

export interface LoadOptions {
	version?: string;
}

export interface Loaded {
	targets: LintTarget[];
	skipped: Array<{ file: string; reason: string }>;
}

function targetsOfBuilt(model: PackageModel, built: string, options: LoadOptions): Loaded {
	const skipped: Loaded['skipped'] = [];
	const targets: LintTarget[] = [];
	if (!isFile(built)) {
		return {
			targets,
			skipped: [{ file: built, reason: 'The built file is not there. Build the package first.' }],
		};
	}
	const { dir, suffix } = sourceDirOf(model.root, built);
	const files = new Map<string, string>();
	classFiles(dir, suffix, files, { left: MAX_SOURCE_FILES });
	const readFile = (path: string) => (isFile(path) ? readFileSync(path, 'utf8') : undefined);
	for (const top of instancesOf(model.load, built)) {
		const versions = top.nodeVersions
			? Object.keys(top.nodeVersions).map(Number)
			: [top.description.version].flat();
		const latest = Math.max(...versions);
		const wanted =
			options.version === undefined
				? [latest]
				: options.version === 'all'
					? versions
					: versions.filter((v) => String(v) === options.version);
		for (const version of wanted) {
			const node = top.nodeVersions ? top.nodeVersions[String(version)] : top;
			const entry = files.get(node.constructor.name);
			const type = `${model.name}.${node.description.name}`;
			if (entry === undefined) {
				skipped.push({
					file: built,
					reason: `The source of the class '${node.constructor.name}' is not there.`,
				});
				continue;
			}
			if (typeof node.execute !== 'function') {
				skipped.push({
					file: entry,
					reason: `'${type}' has no execute method (a trigger or a declarative node). The node compiler does not compile it.`,
				});
				continue;
			}
			targets.push({
				type,
				version,
				node,
				entry,
				registry: model.registry,
				sources: {
					entry: () => entry,
					readFile,
					description: () => node.description,
					aliases: model.aliases,
					evaluate: evaluateInSandbox,
					credentialEntry: model.credentialEntry,
				},
			});
		}
	}
	return { targets, skipped };
}

export function loadTargets(path: string, options: LoadOptions = {}): Loaded {
	const full = resolve(path);
	if (!existsSync(full)) throw new Error(`'${path}' is not there.`);
	const root = packageRootOf(full);
	if (root === undefined) throw new Error(`'${path}' is not in a package (no package.json).`);
	const model = packageModel(root);
	if (!statSync(full).isDirectory()) return targetsOfBuilt(model, builtPathOf(root, full), options);
	const nodes = listed(readPackage(root), 'nodes');
	if (nodes.length === 0)
		throw new Error(`The package.json of '${path}' lists no nodes in "n8n.nodes".`);
	const out: Loaded = { targets: [], skipped: [] };
	for (const node of nodes) {
		const found = targetsOfBuilt(model, join(root, node), options);
		out.targets.push(...found.targets);
		out.skipped.push(...found.skipped);
	}
	return out;
}

export function lintTargets(loaded: Loaded, only?: string): LintReport {
	const nodes = loaded.targets.map((target) => lintTarget(target, only));
	return {
		nodes,
		skipped: loaded.skipped,
		compiled: nodes.reduce((sum, node) => sum + node.compiled, 0),
		total: nodes.reduce((sum, node) => sum + node.total, 0),
		note: LINT_NOTE,
	};
}

const PRECISION_TEXT: Record<NodeDiagnostic['precision'], string> = {
	construct: 'the construct',
	candidate: 'the first construct of this kind; the compiler did not name the function',
	function: 'the start of the function; the compiler did not name the construct',
	file: 'the file; the compiler did not name a function',
};

export function formatReport(report: LintReport, base: string = process.cwd()): string {
	const lines: string[] = [];
	const short = (file: string) => shortPath(file, base);
	for (const node of report.nodes) {
		lines.push(`${node.type}@${node.version}  ${short(node.file)}`);
		for (const op of node.operations) {
			const codes = [...new Set(op.diagnostics.map((d) => d.code))].join(' ');
			lines.push(
				op.compiles
					? `  compiles          ${op.name}${op.verified ? '  (also in the verified list)' : ''}`
					: `  does not compile  ${op.name}  ${codes}`,
			);
		}
		const groups = new Map<string, { diagnostic: NodeDiagnostic; operations: string[] }>();
		for (const op of node.operations) {
			for (const diagnostic of op.diagnostics) {
				const key = `${formatDiagnostic(diagnostic)}`;
				const group = groups.get(key) ?? { diagnostic, operations: [] };
				if (!group.operations.includes(op.name)) group.operations.push(op.name);
				groups.set(key, group);
			}
		}
		if (groups.size > 0) lines.push('', '  What to change:');
		const ordered = [...groups.values()].sort((a, b) => b.operations.length - a.operations.length);
		for (const { diagnostic, operations } of ordered) {
			lines.push(
				`  ${formatDiagnostic(diagnostic, base)}`,
				`      at: ${PRECISION_TEXT[diagnostic.precision]}${diagnostic.function === '' ? '' : ` (function '${diagnostic.function}')`}`,
				`      fix: ${diagnostic.remediation}`,
				...(diagnostic.decided
					? [
							'      note: the project decided not to support this construct. Restructure the code or keep the node in the fallback host.',
						]
					: []),
				`      operations (${operations.length}): ${operations.slice(0, 12).join(', ')}${operations.length > 12 ? ', ...' : ''}`,
			);
		}
		lines.push('', `  ${node.compiled} of ${node.total} operations compile.`, '');
	}
	for (const skip of report.skipped) lines.push(`skipped ${short(skip.file)}: ${skip.reason}`);
	if (report.nodes.length !== 1)
		lines.push(`${report.compiled} of ${report.total} operations compile.`);
	lines.push(
		`Note: ${report.note}`,
		'Rules: packages/@n8n/workflow-lang/docs/node-compile-rules.md',
	);
	return `${lines.join('\n')}\n`;
}

const USAGE =
	'usage: wfc lint-node <path to X.node.ts or to a built package> [--json] [--operation resource.operation] [--version <number>|all]\n';

export function runLintNode(
	args: string[],
	write: (text: string) => void = (text) => process.stdout.write(text),
	writeError: (text: string) => void = (text) => process.stderr.write(text),
): number {
	const flags = ['--operation', '--version'];
	const valueOf = (flag: string) =>
		args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
	const path = args.find((a, at) => !a.startsWith('--') && !flags.includes(args[at - 1]));
	const only = valueOf('--operation');
	if (path === undefined || (args.includes('--operation') && only === undefined)) {
		writeError(USAGE);
		return 2;
	}
	let report: LintReport;
	try {
		report = lintTargets(loadTargets(path, { version: valueOf('--version') }), only);
	} catch (error) {
		writeError(`${error instanceof Error ? error.message : String(error)}\n`);
		return 2;
	}
	if (report.total === 0) {
		for (const skip of report.skipped) writeError(`skipped ${skip.file}: ${skip.reason}\n`);
		writeError(
			only === undefined
				? 'No operation to check.\n'
				: `No operation has the name '${only}'. Give it as resource.operation.\n`,
		);
		return 2;
	}
	write(args.includes('--json') ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report));
	return report.compiled === report.total ? 0 : 1;
}
