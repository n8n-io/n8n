import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';

import { createBackend } from './backend.mjs';
import { createFrontend } from './frontend.mjs';
import {
	formatFiles,
	isModuleId,
	modulesRoot,
	repoRoot,
	ScaffoldError,
	substitutionsFor,
} from './scaffold.mjs';

const STACKS = ['frontend', 'backend', 'both'];

const scaffold = async (args) => {
	const name =
		args.name ??
		(await consola.prompt('Module name (kebab-case)', { type: 'text', cancel: 'reject' }));

	if (!isModuleId(name)) {
		throw new ScaffoldError(
			`"${name}" is not kebab-case. Use lowercase words separated by single hyphens, and start ` +
				'each word with a letter.',
		);
	}

	const stack =
		args.stack ??
		(await consola.prompt('Which side of the module?', {
			type: 'select',
			options: [
				{ value: 'frontend', label: 'frontend', hint: 'a real, resolvable module package' },
				{ value: 'backend', label: 'backend', hint: 'placeholder only, nothing loads it' },
				{ value: 'both', label: 'both' },
			],
			cancel: 'reject',
		}));

	if (!STACKS.includes(stack)) {
		throw new ScaffoldError(`"${stack}" is not a stack. Use one of: ${STACKS.join(', ')}.`);
	}

	const moduleDir = join(modulesRoot, name);
	if (existsSync(moduleDir)) {
		throw new ScaffoldError(`packages/modules/${name} already exists.`);
	}

	const substitutions = substitutionsFor(name);
	const wants = (side) => stack === side || stack === 'both';
	const created = [];
	let edits = [];
	let packageName;

	if (wants('frontend')) {
		const result = createFrontend({
			name,
			packageDir: join(moduleDir, 'frontend'),
			substitutions,
		});
		packageName = result.packageName;
		edits = result.edits;
		created.push(`packages/modules/${name}/frontend  → ${result.packageName}`);
	}

	if (wants('backend')) {
		createBackend({ packageDir: join(moduleDir, 'backend'), substitutions });
		created.push(`packages/modules/${name}/backend   → placeholder, see its README`);
	}

	const formatted = formatFiles([moduleDir, ...edits.map((edit) => edit.path)]);

	consola.success(`Created ${relative(repoRoot, moduleDir)}`);
	for (const line of created) consola.log(`  ${line}`);
	for (const edit of edits) consola.log(`  updated ${edit.note}`);

	if (!formatted) {
		consola.warn('Biome did not run. Run `pnpm install`, then `pnpm format`.');
	}

	if (wants('backend')) {
		consola.warn(
			'The backend half is a placeholder. Nothing loads it: the runtime reads backend\n' +
				'modules from packages/cli/src/modules/<name>. Use `pnpm setup-backend-module`\n' +
				'for a backend module that runs.',
		);
	}

	// `pnpm --filter <pkg> typecheck` fails on a cold tree. The dependencies of the package are not
	// built yet, and that command builds none of them. Turbo builds them first.
	consola.box(
		wants('frontend')
			? [
					'Next:',
					'  pnpm install',
					`  pnpm turbo typecheck --filter=${packageName}`,
					`  pnpm turbo lint --filter=${packageName}`,
					`  pnpm turbo test --filter=${packageName}`,
				].join('\n')
			: ['Next:', `  read packages/modules/${name}/backend/README.md`].join('\n'),
	);
};

const create = defineCommand({
	meta: { name: 'create', description: 'Scaffold a new n8n module' },
	args: {
		name: {
			type: 'positional',
			required: false,
			description: 'Module id, kebab-case (e.g. instance-registry)',
		},
		stack: { type: 'string', description: `One of: ${STACKS.join(', ')}` },
	},
	// citty prints the stack of an error that comes out of `run`. A bad name or a missing anchor is
	// a message for the user, not a defect report.
	async run({ args }) {
		try {
			await scaffold(args);
		} catch (error) {
			if (!(error instanceof ScaffoldError)) throw error;

			consola.error(error.message);
			process.exit(1);
		}
	},
});

await runMain(
	defineCommand({
		meta: {
			name: 'n8n-module-sdk',
			description: 'Scaffold n8n modules (frontend, backend, or both)',
		},
		subCommands: { create },
	}),
);
