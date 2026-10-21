import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import overrides from '../../../nodes-base/nodes/N8n/v2/overrides';
import { buildProperties, checkMethodNames } from './build';
import {
	diffContracts,
	emptyContract,
	OVERRIDES_FILE,
	resolveOperations,
	toContract,
} from './contract';
import { serialize } from './serialize';
import { readSpecOperations } from './spec';
import type { Contract } from './types';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SPEC_DIR = path.join(REPO_ROOT, 'packages/cli/src/public-api/v1');
const GENERATED_DIR = path.join(REPO_ROOT, 'packages/nodes-base/nodes/N8n/v2/generated');
const CONTRACT_PATH = path.join(GENERATED_DIR, 'contract.generated.json');
const DESCRIPTION_PATH = path.join(GENERATED_DIR, 'description.generated.ts');

const args = process.argv.slice(2);
const argValue = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const check = args.includes('--check');
const baseRef = argValue('--base');
const baseFile = argValue('--base-file');

function isContract(value: unknown): value is Contract {
	return (
		typeof value === 'object' && value !== null && 'operations' in value && 'excluded' in value
	);
}

function parseContract(text: string | undefined): Contract | undefined {
	if (!text) return undefined;
	const value: unknown = JSON.parse(text);
	return isContract(value) ? value : undefined;
}

const readFile = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : undefined);

function readBaseContract(): Contract | undefined {
	if (baseFile) return parseContract(readFile(baseFile));
	if (!baseRef) return undefined;
	try {
		const relative = path.relative(REPO_ROOT, CONTRACT_PATH);
		return parseContract(
			execFileSync('git', ['show', `${baseRef}:${relative}`], {
				cwd: REPO_ROOT,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			}),
		);
	} catch {
		return undefined;
	}
}

function fail(title: string, lines: string[]): never {
	console.error(
		`${title}\n\n- ${lines.join('\n- ')}\n\nSee packages/nodes-base/nodes/N8n/v2/README.md.`,
	);
	process.exit(1);
}

const previous = parseContract(readFile(CONTRACT_PATH)) ?? emptyContract();
const { resolved, pending, excluded, errors } = resolveOperations(
	readSpecOperations(SPEC_DIR),
	overrides,
	previous,
);
const configErrors = [...errors, ...checkMethodNames(overrides)];
if (configErrors.length) fail(`Fix ${OVERRIDES_FILE}:`, configErrors);

const { properties, details } = buildProperties(resolved, overrides);
const contract = toContract(resolved, excluded, details);

const contractContent = `${serialize(contract, 'json', 160)}
`;
const descriptionContent = [
	"import type { INodeProperties } from 'n8n-workflow';",
	'',
	`export const generatedProperties: INodeProperties[] = ${serialize(properties, 'ts', 100)};`,
	'',
].join('\n');

if (baseRef || baseFile) {
	const label = baseRef ?? baseFile;
	const base = readBaseContract();
	if (!base) {
		console.log(`No contract at ${label}. Skipping the comparison.`);
	} else {
		const { changes, breaking } = diffContracts(base, contract);
		console.log(
			`n8n node changes since ${label}:\n${changes.length ? changes.map((c) => `  ${c}`).join('\n') : '  none'}`,
		);
		if (breaking.length) fail(`These changes break workflows saved with ${label}:`, breaking);
	}
}

const outputs: Array<[string, string]> = [
	[CONTRACT_PATH, contractContent],
	[DESCRIPTION_PATH, descriptionContent],
];
const pendingByResource = Object.entries(
	pending.reduce<Record<string, number>>(
		(counts, op) => ({ ...counts, [op.resource]: (counts[op.resource] ?? 0) + 1 }),
		{},
	),
)
	.sort(([, a], [, b]) => b - a)
	.map(([resource, count]) => `${resource} ${count}`)
	.join(', ');
const summary = [
	`${resolved.length} operations`,
	`${Object.keys(excluded).length} excluded`,
	...(pending.length ? [`${pending.length} not included yet (${pendingByResource})`] : []),
].join(', ');

if (check) {
	const stale = outputs
		.filter(([file, content]) => readFile(file) !== content)
		.map(([file]) => path.relative(REPO_ROOT, file));
	if (stale.length)
		fail(
			'The generated n8n node is out of date. Run: pnpm --filter @n8n/n8n-node-codegen generate',
			stale,
		);
	console.log(`OK: ${summary}.`);
} else {
	for (const [file, content] of outputs) writeFileSync(file, content);
	console.log(`Generated ${summary}.`);
}
