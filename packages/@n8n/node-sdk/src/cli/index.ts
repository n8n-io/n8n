import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { generateNodeModule } from '../codegen';
import { toContract, type Action, type CredentialDefinition } from '../define';
import { nodeNameOf } from '../runtime';
import { runAction } from '../testing';
import { checkContracts, loadProject, type Project } from './project';

const USAGE = `Usage: n8n-node-next <command>

  new <service> [--dir <path>]    Scaffold a node project
  check                           Type-check (tsc --strict) and check the contracts
  test                            Run src/**/*.test.ts with node:test
  describe [actionId]             Print the typed module the AI workflow builder reads
  run <actionId> --input '<json>' [--credential-file <file.json> | --credential-env <PREFIX>]
                                  Run one action against the live API

Run check, test, describe and run in the project root.`;

const SDK_ROOT = resolve(__dirname, '..', '..');

class CliError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const words = (text: string) => text.split(/[^A-Za-z0-9]+|(?<=[a-z0-9])(?=[A-Z])/).filter(Boolean);
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

function scaffold(service: string | undefined, dir: string | undefined) {
	const parts = words(service ?? '').map((word) => word.toLowerCase());
	if (parts.length === 0) throw new CliError('Usage: n8n-node-next new <service> [--dir <path>]');
	const slug = parts.join('-');
	const tokens: Record<string, string> = {
		__service__: parts.map((word, index) => (index === 0 ? word : capitalize(word))).join(''),
		__Service__: parts.map(capitalize).join(' '),
		__slug__: slug,
		__ENV__: parts.join('_').toUpperCase(),
		__sdk__: SDK_ROOT,
	};
	const target = resolve(dir ?? `n8n-nodes-${slug}`);
	if (existsSync(target) && readdirSync(target).length > 0) {
		throw new CliError(`${target} is not empty`);
	}
	const templates = join(SDK_ROOT, 'templates', 'project');
	const files = readdirSync(templates, { recursive: true, encoding: 'utf8' }).filter((file) =>
		statSync(join(templates, file)).isFile(),
	);
	for (const file of files) {
		const text = Object.entries(tokens).reduce(
			(content, [token, value]) => content.replaceAll(token, value),
			readFileSync(join(templates, file), 'utf8'),
		);
		const path = join(target, file.replace(/\.tmpl$/, ''));
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, text);
	}
	const shown = relative(process.cwd(), target) || '.';
	console.log(
		`Created ${shown}. Next:\n  cd ${shown} && pnpm install\n  n8n-node-next check && n8n-node-next test`,
	);
}

function typecheck(root: string): boolean {
	const tsc = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
	const result = spawnSync(process.execPath, [tsc, '--noEmit', '--strict', '-p', '.'], {
		cwd: root,
		stdio: 'inherit',
	});
	return result.status === 0;
}

async function check(root: string) {
	const typed = typecheck(root);
	const issues = checkContracts(await loadProject(root));
	issues.forEach((issue) => console.error(issue));
	if (!typed || issues.length > 0) {
		throw new CliError(
			`check failed: ${typed ? 'types ok' : 'type errors'}, ${issues.length} contract issue(s)`,
		);
	}
	console.log('check passed');
}

function test(root: string) {
	const files = readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.test.ts'))
		.map((file) => join('src', file));
	if (files.length === 0) throw new CliError('No src/**/*.test.ts files');
	const tsx = require.resolve('tsx/cli');
	const result = spawnSync(process.execPath, [tsx, '--test', ...files], {
		cwd: root,
		stdio: 'inherit',
	});
	if (result.status !== 0) throw new CliError('tests failed');
}

function findAction(project: Project, id: string | undefined): Action {
	const action = project.actions.find((candidate) => candidate.id === id);
	if (!action) {
		const ids = project.actions.map((candidate) => candidate.id).join(', ');
		throw new CliError(`Unknown action "${id ?? ''}". Actions: ${ids}`);
	}
	return action;
}

async function describe(root: string, id: string | undefined) {
	const project = await loadProject(root);
	const actions = id ? [findAction(project, id)] : project.actions;
	const manifest: unknown = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
	const packageName = isRecord(manifest) && typeof manifest.name === 'string' ? manifest.name : '';
	const generated = actions.map((action) => ({
		contract: toContract(action),
		nodeType: `${packageName}.${nodeNameOf(action.id)}`,
	}));
	console.log(generateNodeModule(project.node.id, generated));
}

const upperSnake = (name: string) => words(name).join('_').toUpperCase();

function credentialFromEnv(definition: CredentialDefinition, prefix: string) {
	const variable = (field: string) => `${prefix.replace(/_$/, '')}_${upperSnake(field)}`;
	const missing = definition.properties
		.filter(({ name, required }) => required && process.env[variable(name)] === undefined)
		.map(({ name }) => variable(name));
	if (missing.length > 0) throw new CliError(`Set ${missing.join(', ')}`);
	const data = Object.fromEntries(
		definition.properties.flatMap(({ name }) => {
			const value = process.env[variable(name)];
			return value === undefined ? [] : [[name, value]];
		}),
	);
	return { type: definition.name, data };
}

function readCredential(
	project: Project,
	action: Action,
	options: { file?: string; env?: string },
) {
	const definition = project.credentials.find(({ name }) => action.credentialTypes.includes(name));
	if (options.file) {
		const parsed: unknown = JSON.parse(readFileSync(options.file, 'utf8'));
		if (isRecord(parsed) && typeof parsed.type === 'string' && isRecord(parsed.data)) {
			return { type: parsed.type, data: parsed.data };
		}
		if (isRecord(parsed) && definition) return { type: definition.name, data: parsed };
		throw new CliError(`${options.file} must hold { "type": "...", "data": { ... } }`);
	}
	if (options.env) {
		if (!definition) throw new CliError(`${action.id} accepts no exported credential`);
		return credentialFromEnv(definition, options.env);
	}
	return undefined;
}

function parseInput(text: string): unknown {
	try {
		const input: unknown = JSON.parse(text);
		return input;
	} catch (error) {
		throw new CliError(`--input is not JSON: ${String(error)}`);
	}
}

async function run(
	root: string,
	id: string | undefined,
	options: { input?: string; file?: string; env?: string },
) {
	const project = await loadProject(root);
	const action = findAction(project, id);
	const credential = readCredential(project, action, options);
	const result = await runAction(action, {
		input: parseInput(options.input ?? '{}'),
		credentials: project.credentials,
		...(credential ? { credential } : {}),
	});
	if (!result.ok) {
		console.error(JSON.stringify({ error: result.error }, null, 2));
		process.exitCode = 1;
		return;
	}
	console.log(JSON.stringify(result.items, null, 2));
}

async function main(argv: string[]) {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			dir: { type: 'string' },
			input: { type: 'string' },
			'credential-file': { type: 'string' },
			'credential-env': { type: 'string' },
			help: { type: 'boolean', short: 'h' },
		},
	});
	const [command, argument] = positionals;
	const root = process.cwd();
	switch (command) {
		case 'new':
			return scaffold(argument, values.dir);
		case 'check':
			return await check(root);
		case 'test':
			return test(root);
		case 'describe':
			return await describe(root, argument);
		case 'run':
			return await run(root, argument, {
				input: values.input,
				file: values['credential-file'],
				env: values['credential-env'],
			});
		default:
			console.log(USAGE);
			if (!values.help && command !== undefined) process.exitCode = 1;
	}
}

main(process.argv.slice(2)).catch((error: unknown) => {
	console.error(error instanceof CliError ? error.message : error);
	process.exitCode = 1;
});
