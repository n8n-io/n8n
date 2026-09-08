/**
 * Apps tool — create an app, restore its stored source into a fresh sandbox,
 * and build the current workspace sources into a served version. The agent
 * edits files with the workspace tool in between.
 */
import { Tool } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { posix } from 'node:path';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { SANDBOX_RUNTIME_SKILLS_DIR } from '../skills/materialize-runtime-skills';
import type { InstanceAiContext } from '../types';
import { APPS_TOOL_ID } from './tool-ids';
import { escapeSingleQuotes } from '../workspace/sandbox-fs';
import { NPM_INSTALL_FLAGS } from '../workspace/sandbox-setup';

export { APPS_TOOL_ID };

export const APP_BUILDER_SKILL_DIR = 'app-builder';
export const MAX_APP_TARBALL_BYTES = 20 * 1024 * 1024;
const APPS_DIR = 'apps';
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
		.describe('Starter files to copy (default "vue"). "none" leaves the app directory empty.'),
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
		.describe('shadcn-vue component name, e.g. "accordion" or "alert-dialog"'),
});

type CreateInput = z.infer<typeof createSchema>;
type BuildInput = z.infer<typeof buildSchema>;
type RestoreInput = z.infer<typeof restoreSchema>;
type AddComponentInput = z.infer<typeof addComponentSchema>;
type AppsInput = CreateInput | BuildInput | RestoreInput | AddComponentInput;

// Defaults live here, not in the schema: the flattened union schema the model
// sees wraps every field in `.optional()`, which skips Zod defaults at parse time.
const DEFAULT_TEMPLATE = 'vue';
const DEFAULT_BUILD_COMMAND = 'npm run build';
const DEFAULT_OUT_DIR = 'dist';

type BuildStage = 'install' | 'build' | 'check' | 'store';

interface BuildFailure {
	error: true;
	stage: BuildStage;
	message: string;
	log: string;
}

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
		`cp -r ${q(`${input.templateDir}/.`)} ${q(`${input.appDir}/`)}`,
		`cd ${q(input.appDir)}`,
		'if [ -f gitignore ]; then mv gitignore .gitignore; fi',
		`node -e ${q(patchPackageName)} ${q(input.packageName)}`,
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
	context: InstanceAiContext,
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
	context: InstanceAiContext,
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

async function handleBuild(
	context: InstanceAiContext,
	input: BuildInput,
	abortSignal?: AbortSignal,
) {
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
async function handleRestore(
	context: InstanceAiContext,
	input: RestoreInput,
	abortSignal?: AbortSignal,
) {
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
 * Pulls an extra shadcn-vue component into an app beyond the curated set the
 * template ships with, via the real CLI (so it never drifts from upstream).
 * Runs npm install right away rather than leaving it to the next build:
 * `handleBuild` skips `npm install` whenever `node_modules` already exists,
 * which would otherwise leave a component's own new dependency unresolved.
 */
async function handleAddComponent(
	context: InstanceAiContext,
	input: AddComponentInput,
	abortSignal?: AbortSignal,
) {
	const appService = requireAppService(context);
	const { workspace, run } = requireSandbox(context, abortSignal);
	const app = await appService.get(input.appId);

	const root = await getWorkspaceRoot(workspace);
	const appDir = `${root}/${APPS_DIR}/${app.namespace}`;

	const add = await run(`npx --yes shadcn-vue@latest add ${q(input.component)} --yes --overwrite`, {
		cwd: appDir,
		env: { CI: 'true' },
		timeout: COMMAND_TIMEOUT_MS,
	});
	if (add.exitCode !== 0) {
		return {
			error: true,
			message: `Adding the "${input.component}" component failed. It may not exist in the registry, or its name is misspelled.`,
			log: tailLog(combinedLog(add)),
		};
	}

	const install = await run(`${NO_CORE_DUMPS} npm install ${NPM_INSTALL_FLAGS}`, {
		cwd: appDir,
		env: { CI: 'true' },
		timeout: COMMAND_TIMEOUT_MS,
	});
	if (install.exitCode !== 0) {
		return {
			error: true,
			message: 'npm install failed after adding the component.',
			log: tailLog(combinedLog(install)),
		};
	}

	return { appId: app.id, component: input.component };
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
	context: InstanceAiContext,
): NonNullable<InstanceAiContext['appService']> {
	if (!context.appService) {
		throw new Error('Apps are not available on this instance.');
	}
	return context.appService;
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createAppsTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(
		z.discriminatedUnion('action', [createSchema, buildSchema, restoreSchema, addComponentSchema]),
	);

	return new Tool(APPS_TOOL_ID)
		.description(
			'Create, restore and build user-facing web apps served by n8n at /apps/<namespace>/. ' +
				'Load the `app-builder` skill via `load_skill` before calling this tool. ' +
				'`create` registers the app and copies a starter template into apps/<namespace>/ in the workspace; ' +
				'edit the files there, then call `build` to compile them and publish a new version. ' +
				'`build` returns the live `url` on success, or `{ error, stage, message, log }` to fix and retry. ' +
				'`restore` unpacks the stored source of an existing app into apps/<namespace>/ when this workspace does not have it yet. ' +
				'`add-component` pulls an extra shadcn-vue component into src/components/ui/ beyond the ones the template already has.',
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
			}
		})
		.build();
}
