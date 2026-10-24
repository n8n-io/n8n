import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { format } from 'prettier';

import type { Overrides } from 'n8n-nodes-base/nodes/N8n/v2/define-overrides';
import { buildProperties, checkMethodNames } from './build';
import { diffContracts, emptyContract, resolveOperations, toContract } from './contract';
import {
	CONTRACT_FILE,
	DESCRIPTION_FILE,
	OVERRIDES_FILE,
	README_FILE,
	REPO_ROOT,
	SPEC_DIR,
} from './paths';
import { readSpecOperations } from './spec';
import type { Contract } from './types';

const args = process.argv.slice(2);
const argValue = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const check = args.includes('--check');
const baseRef = argValue('--base');
const baseFile = argValue('--base-file');

function fail(title: string, lines: string[]): never {
	console.error(`${title}\n\n- ${lines.join('\n- ')}\n\nSee ${README_FILE}.`);
	process.exit(1);
}

function isContract(value: unknown): value is Contract {
	return (
		typeof value === 'object' && value !== null && 'operations' in value && 'excluded' in value
	);
}

function parseContract(text: string, source: string): Contract {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		fail('Cannot read the base contract:', [`${source} is not valid JSON.`]);
	}
	if (!isContract(value)) fail('Cannot read the base contract:', [`${source} is not a contract.`]);
	return value;
}

const readFile = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : undefined);

const git = (gitArgs: string[]) =>
	execFileSync('git', gitArgs, {
		cwd: REPO_ROOT,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	});

function gitSucceeds(gitArgs: string[]) {
	try {
		git(gitArgs);
		return true;
	} catch {
		return false;
	}
}

function readBaseContract(): Contract | undefined {
	if (baseFile) {
		const text = readFile(baseFile);
		if (text === undefined) fail('Cannot read the base contract:', [`${baseFile} does not exist.`]);
		return parseContract(text, baseFile);
	}
	if (!baseRef) return undefined;
	if (!gitSucceeds(['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`])) {
		fail('Cannot compare with the base:', [
			`"${baseRef}" is not a known git ref. Fetch the release tags, or check the name.`,
		]);
	}
	if (!gitSucceeds(['cat-file', '-e', `${baseRef}:${CONTRACT_FILE}`])) return undefined;
	return parseContract(git(['show', `${baseRef}:${CONTRACT_FILE}`]), `${baseRef}:${CONTRACT_FILE}`);
}

async function main() {
	const { default: overrides }: { default: Overrides } = await import(
		pathToFileURL(path.join(REPO_ROOT, OVERRIDES_FILE)).href
	);
	const contractPath = path.join(REPO_ROOT, CONTRACT_FILE);
	const descriptionPath = path.join(REPO_ROOT, DESCRIPTION_FILE);

	const previousText = readFile(contractPath);
	const previous = previousText ? parseContract(previousText, CONTRACT_FILE) : emptyContract();
	const { resolved, pending, excluded, errors } = resolveOperations(
		await readSpecOperations(SPEC_DIR),
		overrides,
		previous,
	);
	const configErrors = [...errors, ...checkMethodNames(overrides)];
	if (configErrors.length) fail(`Fix ${OVERRIDES_FILE}:`, configErrors);

	const { properties, details } = buildProperties(resolved, overrides);
	const contract = toContract(resolved, excluded, details);

	const contractContent = await format(JSON.stringify(contract), {
		parser: 'json',
		printWidth: 160,
		useTabs: true,
	});
	const descriptionContent = await format(
		`import type { INodeProperties } from 'n8n-workflow';\n\nexport const generatedProperties: INodeProperties[] = ${JSON.stringify(properties)};\n`,
		{ parser: 'typescript', printWidth: 100, useTabs: true, singleQuote: true },
	);

	if (baseRef ?? baseFile) {
		const label = baseRef ?? baseFile;
		const base = readBaseContract();
		if (!base) {
			console.log(`No contract at ${label}. The node did not exist in that release.`);
		} else {
			const { changes, breaking } = diffContracts(base, contract);
			const list = changes.length ? changes.map((c) => `  ${c}`).join('\n') : '  none';
			console.log(`n8n node changes since ${label}:\n${list}`);
			if (breaking.length) fail(`These changes break workflows saved with ${label}:`, breaking);
		}
	}

	const outputs: Array<[string, string]> = [
		[contractPath, contractContent],
		[descriptionPath, descriptionContent],
	];
	const pendingCounts = pending.reduce<Record<string, number>>(
		(counts, op) => ({ ...counts, [op.resource]: (counts[op.resource] ?? 0) + 1 }),
		{},
	);
	const pendingByResource = Object.entries(pendingCounts)
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
		if (stale.length) {
			fail(
				'The generated n8n node is out of date. Run: pnpm --filter @n8n/n8n-node-codegen generate',
				stale,
			);
		}
		console.log(`OK: ${summary}.`);
	} else {
		for (const [file, content] of outputs) writeFileSync(file, content);
		console.log(`Generated ${summary}.`);
	}
}

void main();
