/**
 * Apps tool — create an app, restore its stored source into a fresh sandbox,
 * bind n8n workflows it may call, and build the current workspace sources into
 * a served version. The agent edits files with the workspace tool in between.
 */
import { Tool } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { AppBinding, DescribedBinding } from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { posix } from 'node:path';
import { z } from 'zod';

import { APPS_TOOL_ID } from './tool-ids';
import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { SANDBOX_RUNTIME_SKILLS_DIR } from '../skills/materialize-runtime-skills';
import type { InstanceAiContext } from '../types';
import { escapeSingleQuotes } from '../workspace/sandbox-fs';
import { NPM_INSTALL_FLAGS } from '../workspace/sandbox-setup';

export { APPS_TOOL_ID };

/**
 * The slice of `InstanceAiContext` the create/build/restore handlers actually
 * touch. Narrow and exported so a headless caller (e.g. the Theme tab's
 * rebuild pipeline) can reuse `handleBuild`/`handleRestore` without
 * constructing — or faking — a full `InstanceAiContext`.
 */
export type AppSandboxContext = Pick<
	InstanceAiContext,
	'appService' | 'workspace' | 'workspaceRoot'
>;

export const APP_BUILDER_SKILL_DIR = 'app-builder';
export const MAX_APP_TARBALL_BYTES = 20 * 1024 * 1024;
const APPS_DIR = 'apps';
/** Module augmentation of `@n8n/app-sdk`, rewritten on every bind/unbind; `tsconfig.json` includes `src/**`. */
const BINDINGS_TYPES_PATH = 'src/n8n-bindings.d.ts';
/** The template's `package.json` depends on `file:vendor/n8n-app-sdk.tgz`. */
const SDK_VENDOR_DIR = 'vendor';
/** Tarballs wait here for read-out: the scoped workspace filesystem rejects paths outside its root. */
const BUILD_STAGING_DIR = '.app-builds';
const COMMAND_TIMEOUT_MS = 600_000;
const LOG_TAIL_BYTES = 4096;
const CHECK_FAIL_MARKER = 'APP_CHECK_FAIL:';
/** Sandboxes have no git identity configured; without one `git commit` refuses to run. */
const GIT_COMMIT = 'git -c user.name=n8n -c user.email=n8n@localhost commit -qm';
/** A node process that dies of heap exhaustion leaves a core dump in the app directory. */
const NO_CORE_DUMPS = 'ulimit -c 0;';
/** Custom build commands get the local binaries the way npm scripts do (`vite build` instead of `npx vite build`). */
const BUILD_COMMAND_PREFIX = `${NO_CORE_DUMPS} export PATH="$PWD/node_modules/.bin:$PATH";`;
/** Core dump names: `core`, `core.<pid>`, `<name>.core`. Anchored to the app root so `src/core/` stays in. */
const CORE_DUMP_EXCLUDES = ['./core', './core.*', './*.core'];

const createSchema = z.object({
	action: z.literal('create'),
	projectId: z.string().describe('Project the app belongs to'),
	name: z.string().min(1).max(128).describe('Display name, e.g. "Greeter"'),
	namespace: z
		.string()
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and single hyphens only')
		.optional()
		.describe('URL slug served at /apps/<namespace>/. Defaults to a slug of the name.'),
	template: z
		.enum(['vue', 'none'])
		.optional()
		.describe(
			'Starter files to copy (default "vue"). "none" writes only vendor/n8n-app-sdk.tgz and src/n8n-bindings.d.ts.',
		),
});

const buildSchema = z.object({
	action: z.literal('build'),
	appId: z.string(),
	command: z
		.string()
		.optional()
		.describe('Build command run in the app directory (default "npm run build")'),
	outDir: z
		.string()
		.optional()
		.describe('Build output directory relative to the app (default "dist")'),
});

const restoreSchema = z.object({
	action: z.literal('restore'),
	appId: z.string(),
});

const addComponentSchema = z.object({
	action: z.literal('add-component'),
	appId: z.string(),
	component: z
		.string()
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and single hyphens only')
		.describe(
			'Component name from this skill\'s catalog (references/design-system.md), e.g. "button" or "dropdown-menu"',
		),
});

const bindSchema = z.object({
	action: z.literal('bind'),
	appId: z.string(),
	bindings: z
		.array(
			z.object({
				key: z
					.string()
					.describe(
						'Slug the app calls the workflow by, e.g. "submit" (lowercase, digits, hyphens)',
					),
				kind: z.literal('workflow'),
				workflowId: z.string(),
			}),
		)
		.describe('Bindings to add or replace by key; other bindings stay'),
});

const unbindSchema = z.object({
	action: z.literal('unbind'),
	appId: z.string(),
	key: z.string(),
});

const bindingsSchema = z.object({
	action: z.literal('bindings'),
	appId: z.string(),
});

type CreateInput = z.infer<typeof createSchema>;
type BuildInput = z.infer<typeof buildSchema>;
type RestoreInput = z.infer<typeof restoreSchema>;
type AddComponentInput = z.infer<typeof addComponentSchema>;
type BindInput = z.infer<typeof bindSchema>;
type UnbindInput = z.infer<typeof unbindSchema>;
type BindingsInput = z.infer<typeof bindingsSchema>;
type AppsInput =
	| CreateInput
	| BuildInput
	| RestoreInput
	| AddComponentInput
	| BindInput
	| UnbindInput
	| BindingsInput;

// Defaults live here, not in the schema: the flattened union schema the model
// sees wraps every field in `.optional()`, which skips Zod defaults at parse time.
const DEFAULT_TEMPLATE = 'vue';
const DEFAULT_BUILD_COMMAND = 'npm run build';
const DEFAULT_OUT_DIR = 'dist';

type BuildStage = 'install' | 'build' | 'check' | 'store';

export interface BuildFailure {
	error: true;
	stage: BuildStage;
	message: string;
	log: string;
}

/** `denied` is a literal so callers can discriminate it from a same-shaped success field left `undefined`. */
export interface AppActionDenied {
	denied: true;
	reason: string;
}

export interface AppBuildSuccess {
	appId: string;
	name: string;
	namespace: string;
	projectId: string;
	versionId: string;
	url: string;
	warnings: string[];
}

export type AppBuildResult = AppActionDenied | BuildFailure | AppBuildSuccess;

export interface AppRestoreSuccess {
	appId: string;
	name: string;
	namespace: string;
	projectId: string;
	versionId: string;
	workspacePath: string;
	warnings: string[];
}

export interface AppRestoreFailure {
	error: true;
	stage: 'restore';
	message: string;
}

export type AppRestoreResult = AppActionDenied | AppRestoreFailure | AppRestoreSuccess;

export function slugifyNamespace(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function tailLog(stdout: string, maxBytes = LOG_TAIL_BYTES): string {
	return stdout.length > maxBytes ? stdout.slice(-maxBytes) : stdout;
}

/**
 * The check script runs `tar -C <outDir>` and `--exclude=<outDir>` inside the
 * app, so the output directory must be a proper subdirectory of it.
 */
function resolveOutDir(raw: string | undefined): string | undefined {
	const outDir = posix.normalize(raw ?? DEFAULT_OUT_DIR).replace(/\/+$/, '');
	const escapes = posix.isAbsolute(outDir) || outDir === '.' || outDir.split('/')[0] === '..';
	return escapes ? undefined : outDir;
}

const q = (value: string) => `'${escapeSingleQuotes(value)}'`;

/** Components the Vue template's own Home.vue demonstrates; added at create time so it never ships broken. */
const STARTER_COMPONENTS = ['button', 'switch'];

/** Copies the contents of one directory into another; both sides must already exist except `dest`. */
const copyDirCommand = (source: string, dest: string) =>
	`cp -r ${q(`${source}/.`)} ${q(`${dest}/`)}`;

/** Where this skill's hand-authored component catalog lives in the materialized skill bundle. */
const componentRegistryDir = (root: string) =>
	`${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${APP_BUILDER_SKILL_DIR}/component-registry`;

/**
 * Copies one or more components from this skill's own component catalog
 * (`component-registry/<name>/`, hand-authored on `@ark-ui/vue`) into the
 * app. A plain local file copy, not a network call — there is no CLI or
 * hosted registry for these components the way shadcn-vue has for reka-ui.
 */
function copyComponentsScript(registryDir: string, appDir: string, components: string[]): string {
	const lines = ['set -e'];
	for (const component of components) {
		const source = `${registryDir}/${component}`;
		const dest = `${appDir}/src/components/ui/${component}`;
		lines.push(
			`[ -d ${q(source)} ] || { echo "not in the component catalog: ${component}" >&2; exit 1; }`,
			`mkdir -p ${q(dest)}`,
			copyDirCommand(source, dest),
		);
	}
	return lines.join('\n');
}

/**
 * Post-build check and packaging as one shell script. A failed check prints a
 * `APP_CHECK_FAIL:` line and exits non-zero; success prints `APP_CHECK_OK`.
 */
export function buildCheckScript(input: {
	appDir: string;
	outDir: string;
	distTarball: string;
	sourceTarball: string;
	maxBytes?: number;
}): string {
	const maxBytes = input.maxBytes ?? MAX_APP_TARBALL_BYTES;
	const outDir = input.outDir.replace(/\/+$/, '');
	return [
		'set -e',
		`cd ${q(input.appDir)}`,
		`if [ ! -f ${q(`${outDir}/index.html`)} ]; then echo ${q(`${CHECK_FAIL_MARKER} ${outDir}/index.html not found. The build must write a static site with index.html at the root of ${outDir}.`)}; exit 1; fi`,
		`if [ -d ${q(`${outDir}/server`)} ] || [ -d .output/server ]; then echo ${q(`${CHECK_FAIL_MARKER} server output found (${outDir}/server or .output/server). Only a static export can be served.`)}; exit 1; fi`,
		`mkdir -p ${q(dirnamePosix(input.distTarball))}`,
		`tar -czf ${q(input.distTarball)} -C ${q(outDir)} .`,
		`tar -czf ${q(input.sourceTarball)} --exclude=node_modules --exclude=${q(outDir)} --exclude=.git ${CORE_DUMP_EXCLUDES.map((pattern) => `--exclude=${q(pattern)}`).join(' ')} -C . .`,
		`dist_size=$(stat -c %s ${q(input.distTarball)})`,
		`src_size=$(stat -c %s ${q(input.sourceTarball)})`,
		`if [ "$dist_size" -gt ${maxBytes} ]; then echo "${CHECK_FAIL_MARKER} build output is $dist_size bytes compressed; the limit is ${maxBytes}. Remove large assets from ${outDir}."; exit 1; fi`,
		`if [ "$src_size" -gt ${maxBytes} ]; then largest=$(du -ah --exclude=node_modules --exclude=.git --exclude=${q(outDir)} . | sort -rh | awk -F'\\t' '$2 != "." { printf "%s%s %s", (n ? ", " : ""), $1, $2; if (++n == 5) exit }'); echo "${CHECK_FAIL_MARKER} source is $src_size bytes compressed; the limit is ${maxBytes}. Largest entries: $largest. Delete them or move them out of the app directory."; exit 1; fi`,
		`(git add -A && ${GIT_COMMIT} build) >/dev/null 2>&1 || true`,
		'echo "APP_CHECK_OK $dist_size $src_size"',
	].join('\n');
}

/** The skill loader drops dot-files, so the template ships `gitignore` and it is renamed here. */
export function buildScaffoldScript(input: {
	templateDir: string;
	appDir: string;
	packageName: string;
}): string {
	const patchPackageName =
		"const fs=require('fs');const p='package.json';" +
		"if(fs.existsSync(p)){const j=JSON.parse(fs.readFileSync(p,'utf8'));j.name=process.argv[1];" +
		"fs.writeFileSync(p,JSON.stringify(j,null,2)+'\\n')}";
	return [
		'set -e',
		copyDirCommand(input.templateDir, input.appDir),
		`cd ${q(input.appDir)}`,
		'if [ -f gitignore ]; then mv gitignore .gitignore; fi',
		`node -e ${q(patchPackageName)} ${q(input.packageName)}`,
	].join('\n');
}

/** Same mapping as the runtime input schema (`fieldTypeToZod`): every field is optional and nullable. */
function fieldTypeToTs(type: string | undefined): string {
	switch (type) {
		case 'number':
			return 'number | null';
		case 'boolean':
			return 'boolean | null';
		case 'array':
			return 'unknown[] | null';
		case 'object':
			return 'Record<string, unknown> | null';
		case 'any':
			return 'unknown';
		default:
			return 'string | null';
	}
}

/** `src/n8n-bindings.d.ts`: keys and input fields of the bound workflows as types for `n8n.workflows.run`. */
export function renderBindingsTypes(bindings: DescribedBinding[]): string {
	const workflows = bindings.map((binding) => {
		const input =
			binding.input === 'passthrough'
				? 'Record<string, unknown>'
				: `{ ${binding.input
						.map((field) => `${JSON.stringify(field.name)}?: ${fieldTypeToTs(field.type)}`)
						.join('; ')} }`;
		return `\t\t\t${JSON.stringify(binding.key)}: { input: ${input}; output: unknown };`;
	});
	// Tabs, like the rest of the template.
	return [
		'// Generated by `apps bind`. Do not edit; re-run bind.',
		"import '@n8n/app-sdk';",
		"declare module '@n8n/app-sdk' {",
		'\tinterface Bindings {',
		...(workflows.length > 0
			? ['\t\tworkflows: {', ...workflows, '\t\t};']
			: ['\t\tworkflows: {};']),
		'\t}',
		'}',
		'',
	].join('\n');
}

function dirnamePosix(path: string): string {
	const index = path.lastIndexOf('/');
	return index <= 0 ? '.' : path.slice(0, index);
}

function checkFailureMessage(stdout: string): string | undefined {
	const line = stdout.split('\n').find((candidate) => candidate.startsWith(CHECK_FAIL_MARKER));
	return line?.slice(CHECK_FAIL_MARKER.length).trim();
}

function failure(stage: BuildStage, message: string, log: string): BuildFailure {
	return { error: true, stage, message, log: tailLog(log) };
}

type SandboxRunner = (
	command: string,
	options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

function requireSandbox(
	context: AppSandboxContext,
	abortSignal?: AbortSignal,
): {
	workspace: NonNullable<InstanceAiContext['workspace']>;
	run: SandboxRunner;
} {
	const workspace = context.workspace;
	const executeCommand = workspace?.sandbox?.executeCommand?.bind(workspace.sandbox);
	if (!workspace || !executeCommand) {
		throw new Error('The apps tool needs a sandbox workspace, which is not available in this run.');
	}
	// Direct `executeCommand`: `runInSandbox` drops `env` and `timeout`, and the
	// build needs both. Daytona merges stderr into stdout, so callers read stdout.
	const run: SandboxRunner = async (command, options) => {
		const result = await executeCommand(command, [], { ...options, abortSignal });
		return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
	};
	return { workspace, run };
}

function combinedLog(result: { stdout: string; stderr: string }): string {
	return result.stderr ? `${result.stdout}\n${result.stderr}` : result.stdout;
}

// Without a `.gitignore` (template "none"), the build's `git add -A` would stage node_modules.
// Some sandboxes ship without git; the agent's own diff/log history is a nicety, not a requirement.
const gitInitCommand = (commitMessage: string) =>
	`[ -f .gitignore ] || printf 'node_modules\\n${DEFAULT_OUT_DIR}\\n' > .gitignore; ` +
	`git init -q && git add -A && ${GIT_COMMIT} ${commitMessage} --allow-empty`;
const GIT_UNAVAILABLE_WARNING =
	'git is unavailable in the sandbox; the app directory is not version-controlled.';

function requireFilesystem(
	workspace: NonNullable<InstanceAiContext['workspace']>,
	purpose: string,
): NonNullable<NonNullable<InstanceAiContext['workspace']>['filesystem']> {
	const filesystem = workspace.filesystem;
	if (!filesystem) throw new Error(`The sandbox workspace has no filesystem to ${purpose}.`);
	return filesystem;
}

async function handleCreate(
	context: AppSandboxContext,
	input: CreateInput,
	abortSignal?: AbortSignal,
) {
	const appService = requireAppService(context);
	const { workspace, run } = requireSandbox(context, abortSignal);
	const namespace = input.namespace ?? slugifyNamespace(input.name);
	if (!namespace) {
		return {
			denied: true,
			reason: `Cannot derive a URL namespace from "${input.name}". Pass an explicit lowercase namespace.`,
		};
	}

	const created = await appService.create({
		projectId: input.projectId,
		name: input.name,
		namespace,
	});
	if ('conflict' in created) {
		return { denied: true, reason: `Namespace "${namespace}" is taken. Choose another.` };
	}

	const root = await getWorkspaceRoot(workspace);
	const appDir = `${root}/${APPS_DIR}/${namespace}`;
	const workspacePath = `${context.workspaceRoot ?? root}/${APPS_DIR}/${namespace}`;

	try {
		const mkdir = await run(`mkdir -p ${q(appDir)}`, { cwd: root });
		if (mkdir.exitCode !== 0) {
			throw new Error(`Could not create ${appDir}: ${tailLog(combinedLog(mkdir))}`);
		}

		const template = input.template ?? DEFAULT_TEMPLATE;
		if (template !== 'none') {
			const templateDir = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${APP_BUILDER_SKILL_DIR}/templates/${template}`;
			const copy = await run(buildScaffoldScript({ templateDir, appDir, packageName: namespace }), {
				cwd: appDir,
			});
			if (copy.exitCode !== 0) {
				throw new Error(`Could not copy the ${template} template: ${tailLog(combinedLog(copy))}`);
			}
		}

		// The Vue template's own Home.vue demonstrates real catalog components rather
		// than hand-rolled markup, so it needs them to exist from the start. This is a
		// local copy, not an install: node_modules is left to the first `build` call,
		// same as the "none" template.
		if (template === 'vue') {
			const addStarters = await run(
				copyComponentsScript(componentRegistryDir(root), appDir, STARTER_COMPONENTS),
				{ cwd: appDir },
			);
			if (addStarters.exitCode !== 0) {
				throw new Error(`Could not add starter components: ${tailLog(combinedLog(addStarters))}`);
			}
		}

		const sdk = await appService.getSdkTarball();
		await requireFilesystem(workspace, 'write the SDK into').writeFile(
			`${APPS_DIR}/${namespace}/${SDK_VENDOR_DIR}/${sdk.filename}`,
			sdk.data,
			{ recursive: true, abortSignal },
		);
		await writeBindingsTypes(workspace, namespace, [], abortSignal);

		const git = await run(gitInitCommand('scaffold'), { cwd: appDir });
		const warnings = git.exitCode === 0 ? [] : [GIT_UNAVAILABLE_WARNING];

		return {
			app: created.app,
			workspacePath,
			...(warnings.length > 0 ? { warnings } : {}),
		};
	} catch (error) {
		throw new Error(
			`App "${input.name}" is registered (id ${created.app.id}, namespace "${namespace}") but scaffolding failed: ` +
				`${getErrorMessage(error)} Write the files by hand under ${workspacePath}, then call build with appId ${created.app.id}.`,
		);
	}
}

export async function handleBuild(
	context: AppSandboxContext,
	input: BuildInput,
	abortSignal?: AbortSignal,
): Promise<AppBuildResult> {
	const appService = requireAppService(context);
	const { workspace, run } = requireSandbox(context, abortSignal);
	const app = await appService.get(input.appId);

	const outDir = resolveOutDir(input.outDir);
	if (!outDir) {
		return {
			denied: true,
			reason: `outDir ${JSON.stringify(input.outDir)} must be a subdirectory of the app, for example "${DEFAULT_OUT_DIR}".`,
		};
	}
	const root = await getWorkspaceRoot(workspace);
	const appDir = `${root}/${APPS_DIR}/${app.namespace}`;
	const command = input.command ?? DEFAULT_BUILD_COMMAND;

	const install = await run(
		`${NO_CORE_DUMPS} if [ -f package.json ] && [ ! -d node_modules ]; then npm install ${NPM_INSTALL_FLAGS}; fi`,
		{ cwd: appDir, env: { CI: 'true' }, timeout: COMMAND_TIMEOUT_MS },
	);
	if (install.exitCode !== 0) {
		return failure('install', 'npm install failed.', combinedLog(install));
	}

	const appBase = `/${APPS_DIR}/${app.namespace}/`;
	const build = await run(`${BUILD_COMMAND_PREFIX} ${command}`, {
		cwd: appDir,
		env: { APP_BASE: appBase, CI: 'true' },
		timeout: COMMAND_TIMEOUT_MS,
	});
	if (build.exitCode !== 0) {
		return failure(
			'build',
			`\`${command}\` exited with code ${build.exitCode}. Fix the errors in the log and build again.`,
			combinedLog(build),
		);
	}

	const tag = `${app.namespace}-${Date.now()}`;
	const stagingDir = `${root}/${BUILD_STAGING_DIR}`;
	const distTarball = `${stagingDir}/${tag}-dist.tgz`;
	const sourceTarball = `${stagingDir}/${tag}-src.tgz`;
	const cleanup = async () => {
		await run(`rm -f ${q(distTarball)} ${q(sourceTarball)}`, { cwd: root }).catch(() => undefined);
	};

	const check = await run(buildCheckScript({ appDir, outDir, distTarball, sourceTarball }), {
		cwd: appDir,
		timeout: COMMAND_TIMEOUT_MS,
	});
	if (check.exitCode !== 0) {
		await cleanup();
		const log = combinedLog(check);
		return failure('check', checkFailureMessage(log) ?? 'Post-build check failed.', log);
	}

	try {
		const [source, dist] = await Promise.all([
			readTarball(workspace, `${BUILD_STAGING_DIR}/${tag}-src.tgz`, abortSignal),
			readTarball(workspace, `${BUILD_STAGING_DIR}/${tag}-dist.tgz`, abortSignal),
		]);
		const stored = await appService.storeVersion(app.id, { source, dist });
		return {
			appId: app.id,
			name: app.name,
			namespace: app.namespace,
			projectId: app.projectId,
			versionId: stored.versionId,
			url: stored.url,
			warnings: [],
		};
	} catch (error) {
		return failure('store', getErrorMessage(error), combinedLog(check));
	} finally {
		await cleanup();
	}
}

/**
 * Rehydrate `apps/<namespace>/` from the stored source tarball. Needed when a
 * thread starts in a fresh sandbox that never held the app's files.
 */
export async function handleRestore(
	context: AppSandboxContext,
	input: RestoreInput,
	abortSignal?: AbortSignal,
): Promise<AppRestoreResult> {
	const appService = requireAppService(context);
	const { workspace, run } = requireSandbox(context, abortSignal);
	const app = await appService.get(input.appId);

	const root = await getWorkspaceRoot(workspace);
	const appDir = `${root}/${APPS_DIR}/${app.namespace}`;
	const workspacePath = `${context.workspaceRoot ?? root}/${APPS_DIR}/${app.namespace}`;

	const occupied = await run(`[ -d ${q(appDir)} ] && [ -n "$(ls -A ${q(appDir)})" ]`, {
		cwd: root,
	});
	if (occupied.exitCode === 0) {
		return {
			denied: true,
			reason: `${workspacePath} already exists and is not empty. Edit the files there; restore only fills an empty app directory.`,
		};
	}

	const tarball = await appService.getSourceTarball(app.id);
	if (!tarball) {
		return {
			denied: true,
			reason: `App "${app.name}" has no stored version to restore. Write the files under ${workspacePath} by hand, then call build.`,
		};
	}

	const relativeTarball = `${BUILD_STAGING_DIR}/${app.namespace}-${Date.now()}-restore.tgz`;
	const tarballPath = `${root}/${relativeTarball}`;
	try {
		const staging = await run(`mkdir -p ${q(`${root}/${BUILD_STAGING_DIR}`)}`, { cwd: root });
		if (staging.exitCode !== 0) {
			throw new Error(`Could not create the staging directory: ${tailLog(combinedLog(staging))}`);
		}
		await requireFilesystem(workspace, 'write the source into').writeFile(
			relativeTarball,
			tarball.data,
			{ abortSignal },
		);
		const unpack = `mkdir -p ${q(appDir)} && tar -xzf ${q(tarballPath)} -C ${q(appDir)}`;
		const extract = await run(unpack, { cwd: root });
		if (extract.exitCode !== 0) {
			throw new Error(`Could not unpack the stored source: ${tailLog(combinedLog(extract))}`);
		}

		const git = await run(gitInitCommand('restore'), { cwd: appDir });
		return {
			appId: app.id,
			name: app.name,
			namespace: app.namespace,
			projectId: app.projectId,
			versionId: tarball.versionId,
			workspacePath,
			warnings: git.exitCode === 0 ? [] : [GIT_UNAVAILABLE_WARNING],
		};
	} catch (error) {
		return { error: true, stage: 'restore', message: getErrorMessage(error) };
	} finally {
		await run(`rm -f ${q(tarballPath)}`, { cwd: root }).catch(() => undefined);
	}
}

/**
 * Copies a component from this skill's own catalog into an app, on demand,
 * rather than shipping every component pre-generated in the template. No
 * install step: every catalog component shares the one `@ark-ui/vue` base
 * dependency already in the template's `package.json` from `create`, so a
 * copy never changes dependencies. A future component that needs its own
 * extra dependency must add it to the template's base `package.json` too
 * (the way `class-variance-authority` already is) — `handleBuild` only
 * installs when `node_modules` is missing, so it won't pick up a dependency
 * added after the app's first build.
 */
async function handleAddComponent(
	context: AppSandboxContext,
	input: AddComponentInput,
	abortSignal?: AbortSignal,
) {
	const appService = requireAppService(context);
	const { workspace, run } = requireSandbox(context, abortSignal);
	const app = await appService.get(input.appId);

	const root = await getWorkspaceRoot(workspace);
	const appDir = `${root}/${APPS_DIR}/${app.namespace}`;

	const add = await run(
		copyComponentsScript(componentRegistryDir(root), appDir, [input.component]),
		{ cwd: appDir },
	);
	if (add.exitCode !== 0) {
		return {
			error: true,
			message: `"${input.component}" is not in this app-builder skill's component catalog. Check references/design-system.md for the exact name.`,
			log: tailLog(combinedLog(add)),
		};
	}

	return { appId: app.id, component: input.component };
}

async function writeBindingsTypes(
	workspace: NonNullable<InstanceAiContext['workspace']>,
	namespace: string,
	bindings: DescribedBinding[],
	abortSignal?: AbortSignal,
) {
	await requireFilesystem(workspace, 'write the binding types into').writeFile(
		`${APPS_DIR}/${namespace}/${BINDINGS_TYPES_PATH}`,
		renderBindingsTypes(bindings),
		{ recursive: true, abortSignal },
	);
}

type DescribedBindings = { bindings: DescribedBinding[]; warnings: string[] };

/**
 * Every binding check (scope, project, trigger, key format) lives in the app service,
 * so anything it throws is a refusal the model can act on. The upsert starts from the
 * stored list, not the described one: describe omits a binding whose draft is broken
 * while its published version still runs, and a write must not drop it silently.
 */
async function replaceBindings(
	context: InstanceAiContext,
	appId: string,
	namespace: string,
	next: (current: AppBinding[]) => AppBinding[],
	abortSignal?: AbortSignal,
) {
	const appService = requireAppService(context);
	const { workspace } = requireSandbox(context, abortSignal);

	let described: DescribedBindings;
	try {
		const current = await appService.getBindings(appId);
		described = await appService.setBindings(appId, next(current.stored));
	} catch (error) {
		return { denied: true, reason: getErrorMessage(error) };
	}

	try {
		await writeBindingsTypes(workspace, namespace, described.bindings, abortSignal);
	} catch (error) {
		return {
			error: true,
			stage: 'types',
			message: `The bindings are saved, but ${BINDINGS_TYPES_PATH} could not be written: ${getErrorMessage(error)}`,
		};
	}

	return {
		appId,
		bindings: described.bindings,
		typesPath: BINDINGS_TYPES_PATH,
		warnings: described.warnings,
	};
}

/** Upsert by key: a binding with an existing key replaces it, the others stay. */
async function handleBind(context: InstanceAiContext, input: BindInput, abortSignal?: AbortSignal) {
	// The flattened schema the model sees makes every field optional, so the guard lives here.
	if (!input.bindings?.length) {
		return {
			denied: true,
			reason: 'Pass at least one binding as { key, kind: "workflow", workflowId }.',
		};
	}
	const app = await requireAppService(context).get(input.appId);
	const replaced = new Set(input.bindings.map((binding) => binding.key));
	return await replaceBindings(
		context,
		app.id,
		app.namespace,
		(current) => [...current.filter((binding) => !replaced.has(binding.key)), ...input.bindings],
		abortSignal,
	);
}

async function handleUnbind(
	context: InstanceAiContext,
	input: UnbindInput,
	abortSignal?: AbortSignal,
) {
	const app = await requireAppService(context).get(input.appId);
	return await replaceBindings(
		context,
		app.id,
		app.namespace,
		(current) => current.filter((binding) => binding.key !== input.key),
		abortSignal,
	);
}

async function handleBindings(context: InstanceAiContext, input: BindingsInput) {
	const appService = requireAppService(context);
	const app = await appService.get(input.appId);
	const { bindings, warnings } = await appService.getBindings(app.id);
	return { appId: app.id, bindings, warnings };
}

async function readTarball(
	workspace: NonNullable<InstanceAiContext['workspace']>,
	relativePath: string,
	abortSignal?: AbortSignal,
): Promise<Buffer> {
	const filesystem = requireFilesystem(workspace, 'read the build from');
	const content = await filesystem.readFile(relativePath, { abortSignal });
	if (!Buffer.isBuffer(content)) {
		throw new Error(`Expected binary content for ${relativePath}, got a string.`);
	}
	return content;
}

function requireAppService(
	context: AppSandboxContext,
): NonNullable<InstanceAiContext['appService']> {
	if (!context.appService) {
		throw new Error('Apps are not available on this instance.');
	}
	return context.appService;
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createAppsTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(
		z.discriminatedUnion('action', [
			createSchema,
			buildSchema,
			restoreSchema,
			addComponentSchema,
			bindSchema,
			unbindSchema,
			bindingsSchema,
		]),
	);

	return new Tool(APPS_TOOL_ID)
		.description(
			'Create, restore, bind and build user-facing web apps served by n8n at /apps/<namespace>/. ' +
				'Load the `app-builder` skill via `load_skill` before calling this tool. ' +
				'`create` registers the app and copies a starter template into apps/<namespace>/ in the workspace; ' +
				'edit the files there, then call `build` to compile them and publish a new version. ' +
				'`build` returns the live `url` on success, or `{ error, stage, message, log }` to fix and retry. ' +
				'`restore` unpacks the stored source of an existing app into apps/<namespace>/ when this workspace does not have it yet. ' +
				"`add-component` copies a component from this app-builder skill's own catalog (built on @ark-ui/vue) into src/components/ui/ — `create` uses it for the two the starter page needs, and every other component goes through it too. " +
				'`bind` lets the app call n8n workflows by key through `@n8n/app-sdk` (`n8n.workflows.run(key, input)`): ' +
				'pass `{ key, kind: "workflow", workflowId }` entries, and it rewrites src/n8n-bindings.d.ts with the input types. ' +
				'`unbind` removes a key; `bindings` lists the current ones. Bind before writing code that calls a workflow.',
		)
		.input(inputSchema)
		.handler(async (input: AppsInput, ctx) => {
			switch (input.action) {
				case 'create':
					return await handleCreate(context, input, ctx.abortSignal);
				case 'build':
					return await handleBuild(context, input, ctx.abortSignal);
				case 'restore':
					return await handleRestore(context, input, ctx.abortSignal);
				case 'add-component':
					return await handleAddComponent(context, input, ctx.abortSignal);
				case 'bind':
					return await handleBind(context, input, ctx.abortSignal);
				case 'unbind':
					return await handleUnbind(context, input, ctx.abortSignal);
				case 'bindings':
					return await handleBindings(context, input);
			}
		})
		.build();
}
