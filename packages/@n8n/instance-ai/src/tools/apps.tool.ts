/**
 * Apps tool — create an app, restore its stored source into the app's own
 * sandbox, bind n8n workflows and data tables it may use, and publish it as a
 * served version once the user confirms. The agent edits files with the
 * workspace tools and `sandbox: 'app'` in between; the live preview follows.
 */
import { Tool } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import {
	appBindingMetaSchema,
	dataTablePermissionSchema,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	type AppBinding,
	type AppBindingMeta,
	type DescribedBinding,
	type DescribedDataTableBinding,
	type DescribedWorkflowBinding,
} from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { nanoid } from 'nanoid';
import { posix } from 'node:path';
import { z } from 'zod';

import { APPS_TOOL_ID } from './tool-ids';
import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { SANDBOX_RUNTIME_SKILLS_DIR } from '../skills/materialize-runtime-skills';
import type { AppSummary, InstanceAiContext } from '../types';
import { escapeSingleQuotes } from '../workspace/sandbox-fs';
import { NPM_INSTALL_FLAGS } from '../workspace/sandbox-setup';

export { APPS_TOOL_ID };

/**
 * The slice of `InstanceAiContext` the create/build/restore handlers actually
 * touch. Narrow and exported so a headless caller (n8n's publish pipeline) can
 * reuse `handleBuild`/`handleRestore` without constructing — or faking — a full
 * `InstanceAiContext`.
 */
export type AppSandboxContext = Pick<
	InstanceAiContext,
	'appService' | 'appWorkspace' | 'workspaceRoot' | 'getAppId'
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
const NPM_INSTALL_COMMAND = `npm install ${NPM_INSTALL_FLAGS}`;
/** Exit code `installDependencies` reserves for "nothing to install"; npm itself never uses it. */
const NO_PACKAGE_JSON_EXIT = 99;
/** Core dump names: `core`, `core.<pid>`, `<name>.core`. Anchored to the app root so `src/core/` stays in. */
const CORE_DUMP_EXCLUDES = ['./core', './core.*', './*.core'];
/** Written by n8n's live preview inside the app directory: the dev server's log and pid, and the fallback build's output. */
const LIVE_PREVIEW_FILES = ['.n8n-dev.log', '.n8n-dev.pid', '.n8n-preview-dist'];

const createSchema = z.object({
	action: z.literal('create'),
	projectId: z
		.string()
		.optional()
		.describe(
			'Project the app belongs to; defaults to the project bound to this conversation, else the personal project',
		),
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

const publishSchema = z.object({
	action: z.literal('publish'),
	appId: z.string(),
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

// A flat object, not a union per kind: the sanitized schema the model sees flattens a
// nested union to this shape anyway, so the per-kind field check lives in `handleBind`.
const bindSchema = z.object({
	action: z.literal('bind'),
	appId: z.string(),
	bindings: z
		.array(
			z.object({
				key: z
					.string()
					.describe(
						'Slug the app calls the workflow or table by, e.g. "submit" or "tasks" (lowercase, digits, hyphens)',
					),
				kind: z.enum(['workflow', 'dataTable']),
				workflowId: z.string().optional().describe('For kind "workflow"'),
				dataTableId: z.string().optional().describe('For kind "dataTable"'),
				permissions: z
					.array(dataTablePermissionSchema)
					.optional()
					.describe(
						'For kind "dataTable": "read" lists rows; "write" inserts, updates and deletes them',
					),
			}),
		)
		.describe(
			'Bindings to add or replace by key; other bindings stay. One kind per call: workflows and data tables are approved separately.',
		),
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

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	appBinding: appBindingMetaSchema.optional(),
});

interface ConfirmationToolContext {
	resumeData: z.infer<typeof instanceAiApprovalResumeSchema> | undefined;
	suspend: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
	abortSignal?: AbortSignal;
}

type CreateInput = z.infer<typeof createSchema>;
type PublishInput = z.infer<typeof publishSchema>;
type RestoreInput = z.infer<typeof restoreSchema>;
type AddComponentInput = z.infer<typeof addComponentSchema>;
type BindInput = z.infer<typeof bindSchema>;
type FlatBinding = BindInput['bindings'][number];
type WorkflowBinding = Extract<AppBinding, { kind: 'workflow' }>;
type DataTableBinding = Extract<AppBinding, { kind: 'dataTable' }>;
type BindPermission = 'bindAppWorkflow' | 'bindAppDataTable';
type UnbindInput = z.infer<typeof unbindSchema>;
type BindingsInput = z.infer<typeof bindingsSchema>;
type AppsInput =
	| CreateInput
	| PublishInput
	| RestoreInput
	| AddComponentInput
	| BindInput
	| UnbindInput
	| BindingsInput;

/** Not a tool action: n8n's publish pipeline calls `handleBuild` directly. */
export interface BuildInput {
	action: 'build';
	appId: string;
	/** Build command run in the app directory (default "npm run build"). */
	command?: string;
	/** Build output directory relative to the app (default "dist"). */
	outDir?: string;
}

/** Thread-level "always allow" grant; the editor derives the same `<tool>:<action>` key. */
const PUBLISH_SESSION_GRANT_KEY = `${APPS_TOOL_ID}:publish`;

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
	/** Absent when the app had no stored source and the starter template was laid down instead. */
	versionId?: string;
	scaffolded: boolean;
	workspacePath: string;
	installed: boolean;
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
		`tar -czf ${q(input.sourceTarball)} --exclude=node_modules --exclude=${q(outDir)} --exclude=.git ${[...LIVE_PREVIEW_FILES, ...CORE_DUMP_EXCLUDES.map(q)].map((pattern) => `--exclude=${pattern}`).join(' ')} -C . .`,
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

const dedupeUnion = (members: string[]) => {
	const unique = [...new Set(members)];
	return unique.includes('unknown') ? 'unknown' : unique.join(' | ');
};

/** `T[]` reads well for a bare name; anything with spaces or a union goes in `Array<…>`. */
const arrayOf = (item: string) => (/^[\w.]+(\[\])*$/.test(item) ? `${item}[]` : `Array<${item}>`);

function objectToTs(schema: JSONSchema7): string {
	const properties = Object.entries(schema.properties ?? {});
	if (properties.length === 0) {
		const extra = schema.additionalProperties;
		// An open object is `any`, not `unknown`: the file lives inside the app, and
		// `unknown` would force a cast on every read of a result.
		if (extra === true) return 'Record<string, any>';
		if (typeof extra === 'object') {
			const value = jsonSchemaToTs(extra);
			return value === 'unknown' ? 'Record<string, any>' : `Record<string, ${value}>`;
		}
		return 'Record<string, unknown>';
	}
	const required = new Set(schema.required ?? []);
	const fields = properties.map(
		([name, property]) =>
			`${JSON.stringify(name)}${required.has(name) ? '' : '?'}: ${jsonSchemaToTs(property)}`,
	);
	return `{ ${fields.join('; ')} }`;
}

/**
 * The JSON Schema subset the backend emits (draft-07: `type`, type unions, `anyOf`,
 * `properties`/`required`, `additionalProperties`, `items`) as a TypeScript type.
 * Anything else is `unknown`.
 */
export function jsonSchemaToTs(schema: JSONSchema7Definition): string {
	if (schema === true) return 'unknown';
	if (schema === false) return 'never';
	if (schema.anyOf) return dedupeUnion(schema.anyOf.map(jsonSchemaToTs));
	if (schema.type === undefined) return 'unknown';
	const types = Array.isArray(schema.type) ? schema.type : [schema.type];
	return dedupeUnion(
		types.map((type) => {
			switch (type) {
				case 'object':
					return objectToTs(schema);
				case 'array':
					return arrayOf(
						schema.items === undefined || Array.isArray(schema.items)
							? 'unknown'
							: jsonSchemaToTs(schema.items),
					);
				case 'integer':
					return 'number';
				default:
					return type;
			}
		}),
	);
}

const isWorkflowBinding = (binding: DescribedBinding): binding is DescribedWorkflowBinding =>
	binding.kind === 'workflow' && !binding.missing;
const isDataTableBinding = (binding: DescribedBinding): binding is DescribedDataTableBinding =>
	binding.kind === 'dataTable' && !binding.missing;

/**
 * `src/n8n-bindings.d.ts`: keys, input schema and observed output schema of the bound
 * workflows as types for `n8n.workflows.run`, and the row type of each bound data table
 * for `n8n.tables.<key>`. A binding whose resource is gone gets no entry.
 */
export function renderBindingsTypes(bindings: DescribedBinding[]): string {
	const liveWorkflows = bindings.filter(isWorkflowBinding);
	const workflows = liveWorkflows.map(
		(binding) =>
			`\t\t\t${JSON.stringify(binding.key)}: { input: ${jsonSchemaToTs(binding.input)}; output: ${jsonSchemaToTs(binding.output)} };`,
	);
	const tables = bindings
		.filter(isDataTableBinding)
		.map(
			(binding) => `\t\t\t${JSON.stringify(binding.key)}: { row: ${jsonSchemaToTs(binding.row)} };`,
		);
	const sources = liveWorkflows.flatMap((binding) =>
		binding.outputSource.kind === 'execution'
			? [
					`// output of ${JSON.stringify(binding.key)} inferred from execution ${binding.outputSource.executionId} (${binding.outputSource.at}); re-run \`apps bindings\` after changing the workflow`,
				]
			: [],
	);
	const block = (name: string, lines: string[]) =>
		lines.length > 0 ? [`\t\t${name}: {`, ...lines, '\t\t};'] : [`\t\t${name}: {};`];
	// Tabs, like the rest of the template.
	return [
		'// Generated by `apps bind`. Do not edit; re-run bind.',
		...sources,
		"import '@n8n/app-sdk';",
		"declare module '@n8n/app-sdk' {",
		'\tinterface Bindings {',
		...block('workflows', workflows),
		...block('tables', tables),
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
	workspace: NonNullable<InstanceAiContext['appWorkspace']>;
	run: SandboxRunner;
} {
	const workspace = context.appWorkspace;
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

/**
 * The live preview's dev server needs node_modules, so `create` and `restore`
 * install right away instead of leaving it to the first build. A failed install
 * is a warning, not a failed action: the app directory is in place and the
 * agent can run `npm install` itself.
 */
async function installDependencies(
	run: SandboxRunner,
	appDir: string,
): Promise<{ installed: boolean; warning?: string }> {
	const install = await run(
		`${NO_CORE_DUMPS} if [ -f package.json ]; then ${NPM_INSTALL_COMMAND}; else exit ${NO_PACKAGE_JSON_EXIT}; fi`,
		{ cwd: appDir, env: { CI: 'true' }, timeout: COMMAND_TIMEOUT_MS },
	);
	if (install.exitCode === 0) return { installed: true };
	if (install.exitCode === NO_PACKAGE_JSON_EXIT) return { installed: false };
	return {
		installed: false,
		warning: `npm install failed, so the live preview cannot start yet. Fix package.json if needed, then run \`npm install\` in the app directory. Log: ${tailLog(combinedLog(install))}`,
	};
}

function requireFilesystem(
	workspace: NonNullable<InstanceAiContext['appWorkspace']>,
	purpose: string,
): NonNullable<NonNullable<InstanceAiContext['appWorkspace']>['filesystem']> {
	const filesystem = workspace.filesystem;
	if (!filesystem) throw new Error(`The sandbox workspace has no filesystem to ${purpose}.`);
	return filesystem;
}

/**
 * Lays down a fresh `apps/<namespace>/`: starter template, SDK tarball,
 * binding types, a git baseline and node_modules. A failed git or install is
 * a warning; every other failure throws.
 */
async function scaffoldApp(input: {
	context: AppSandboxContext;
	workspace: NonNullable<InstanceAiContext['appWorkspace']>;
	run: SandboxRunner;
	root: string;
	namespace: string;
	template: NonNullable<CreateInput['template']>;
	bindings: DescribedBinding[];
	abortSignal?: AbortSignal;
}): Promise<{ installed: boolean; warnings: string[] }> {
	const { run, root, namespace, template, abortSignal } = input;
	const appDir = `${root}/${APPS_DIR}/${namespace}`;

	const mkdir = await run(`mkdir -p ${q(appDir)}`, { cwd: root });
	if (mkdir.exitCode !== 0) {
		throw new Error(`Could not create ${appDir}: ${tailLog(combinedLog(mkdir))}`);
	}

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
	// local copy, not an install.
	if (template === 'vue') {
		const addStarters = await run(
			copyComponentsScript(componentRegistryDir(root), appDir, STARTER_COMPONENTS),
			{ cwd: appDir },
		);
		if (addStarters.exitCode !== 0) {
			throw new Error(`Could not add starter components: ${tailLog(combinedLog(addStarters))}`);
		}
	}

	const appService = requireAppService(input.context);
	await writeSdkTarball(input.workspace, namespace, await appService.getSdkTarball(), abortSignal);
	await writeBindingsTypes(input.workspace, namespace, input.bindings, abortSignal);

	const git = await run(gitInitCommand('scaffold'), { cwd: appDir });
	const install =
		template === 'none' ? { installed: false } : await installDependencies(run, appDir);
	return {
		installed: install.installed,
		warnings: [
			...(git.exitCode === 0 ? [] : [GIT_UNAVAILABLE_WARNING]),
			...(install.warning ? [install.warning] : []),
		],
	};
}

async function handleCreate(
	context: AppSandboxContext,
	input: CreateInput,
	abortSignal?: AbortSignal,
) {
	const appService = requireAppService(context);
	const boundAppId = context.getAppId?.();
	if (boundAppId) {
		const bound = await appService.get(boundAppId);
		return {
			denied: true,
			reason: `This thread builds app "${bound.name}" (id ${bound.id}). Start a new thread to build another app.`,
		};
	}
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
	const workspacePath = `${context.workspaceRoot ?? root}/${APPS_DIR}/${namespace}`;

	try {
		const { installed, warnings } = await scaffoldApp({
			context,
			workspace,
			run,
			root,
			namespace,
			template: input.template ?? DEFAULT_TEMPLATE,
			bindings: [],
			abortSignal,
		});

		return {
			app: created.app,
			workspacePath,
			installed,
			...(warnings.length > 0 ? { warnings } : {}),
		};
	} catch (error) {
		throw new Error(
			`App "${input.name}" is registered (id ${created.app.id}, namespace "${namespace}") but scaffolding failed: ` +
				`${getErrorMessage(error)} Write the files by hand under ${workspacePath} with sandbox 'app' (app id ${created.app.id}).`,
		);
	}
}

/**
 * Publishing makes the draft public at /apps/<namespace>/, so the user
 * confirms first (or granted "always allow" for this thread). The build itself
 * runs in n8n's own sandbox, after the thread's current edits are snapshotted.
 */
async function handlePublish(
	context: InstanceAiContext,
	input: PublishInput,
	ctx: ConfirmationToolContext,
) {
	const appService = requireAppService(context);
	const app = await appService.get(input.appId);
	const resumeData = ctx.resumeData;

	const needsApproval = context.sessionApprovedToolKeys?.has(PUBLISH_SESSION_GRANT_KEY) !== true;
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Publish ${app.name} to /${APPS_DIR}/${app.namespace}/`,
			severity: 'info' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'user_declined' };
	}

	if (resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(PUBLISH_SESSION_GRANT_KEY);
	}

	const published = await appService.publish(app.id);
	if ('error' in published) return published;
	return {
		appId: app.id,
		name: app.name,
		namespace: app.namespace,
		projectId: app.projectId,
		versionId: published.versionId,
		url: published.url,
	};
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
		`${NO_CORE_DUMPS} if [ -f package.json ] && [ ! -d node_modules ]; then ${NPM_INSTALL_COMMAND}; fi`,
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
 * Rehydrate `apps/<namespace>/` from the newest stored source (a per-turn
 * snapshot or a build), or lay down the starter template for an app that has
 * no source yet. Needed when the app's sandbox is new and never held the
 * app's files.
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

	// `bind` may run before `restore` in a fresh sandbox; the file it generates is
	// rewritten below, so it does not count as the user's work.
	const occupied = await run(
		`[ -d ${q(appDir)} ] && [ -n "$(cd ${q(appDir)} && find . -type f ! -path ${q(`./${BINDINGS_TYPES_PATH}`)})" ]`,
		{ cwd: root },
	);
	if (occupied.exitCode === 0) {
		return {
			denied: true,
			reason: `${workspacePath} already exists and is not empty. Edit the files there with sandbox 'app'; restore only fills an empty app directory.`,
		};
	}

	const tarball = await appService.getSourceTarball(app.id);
	if (!tarball) {
		try {
			const described = await appService.getBindings(app.id);
			const { installed, warnings } = await scaffoldApp({
				context,
				workspace,
				run,
				root,
				namespace: app.namespace,
				template: DEFAULT_TEMPLATE,
				bindings: described.bindings,
				abortSignal,
			});
			return {
				appId: app.id,
				name: app.name,
				namespace: app.namespace,
				projectId: app.projectId,
				scaffolded: true,
				workspacePath,
				installed,
				warnings: [...warnings, ...described.warnings],
			};
		} catch (error) {
			return { error: true, stage: 'restore', message: getErrorMessage(error) };
		}
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

		// The stored source keeps the SDK the app was created with: a restore must not
		// upgrade it. The binding types follow the current bindings.
		const described = await appService.getBindings(app.id);
		await writeBindingsTypes(workspace, app.namespace, described.bindings, abortSignal);

		const git = await run(gitInitCommand('restore'), { cwd: appDir });
		const install = await installDependencies(run, appDir);
		return {
			appId: app.id,
			name: app.name,
			namespace: app.namespace,
			projectId: app.projectId,
			versionId: tarball.versionId,
			scaffolded: false,
			workspacePath,
			installed: install.installed,
			warnings: [
				...(git.exitCode === 0 ? [] : [GIT_UNAVAILABLE_WARNING]),
				...(install.warning ? [install.warning] : []),
				...described.warnings,
			],
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
 * (the way `class-variance-authority` already is) — `create` installs once
 * and `handleBuild` only installs when `node_modules` is missing, so neither
 * picks up a dependency added later.
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

async function writeSdkTarball(
	workspace: NonNullable<InstanceAiContext['appWorkspace']>,
	namespace: string,
	sdk: { filename: string; data: Uint8Array },
	abortSignal?: AbortSignal,
) {
	await requireFilesystem(workspace, 'write the SDK into').writeFile(
		`${APPS_DIR}/${namespace}/${SDK_VENDOR_DIR}/${sdk.filename}`,
		sdk.data,
		{ recursive: true, abortSignal },
	);
}

async function writeBindingsTypes(
	workspace: NonNullable<InstanceAiContext['appWorkspace']>,
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
 * stored list, not the described one: describe omits a binding whose resolved workflow
 * is broken, and a write must not drop it silently.
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

async function resolveWorkflowName(context: InstanceAiContext, workflowId: string) {
	return await context.workflowService
		.get(workflowId)
		.then((workflow) => workflow.name)
		.catch(() => workflowId);
}

/**
 * The `bindAppWorkflow` or `bindAppDataTable` permission, the way `workflows` asks before
 * a publish: `null` when the action may proceed, the reason when it may not; suspends for
 * the card when the user has not answered it yet.
 */
async function requireBindApproval(
	context: InstanceAiContext,
	ctx: ConfirmationToolContext,
	permission: BindPermission,
	describe: () => Promise<{ message: string; appBinding?: AppBindingMeta }>,
): Promise<AppActionDenied | null> {
	const mode = context.permissions?.[permission];
	if (mode === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}
	const resumeData = ctx.resumeData;
	const needsApproval = mode !== 'always_allow';
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			...(await describe()),
			severity: 'warning' as const,
		});
	}
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}
	return null;
}

type BoundApp = Omit<AppSummary, 'createdAt'>;
type BindDescription = { message: string; appBinding?: AppBindingMeta };

/** The model passes one flat object per binding; the service wants the discriminated union. */
function toAppBinding(flat: FlatBinding): AppBinding | AppActionDenied {
	const { key, kind, workflowId, dataTableId, permissions } = flat;
	if (kind === 'workflow') {
		return workflowId !== undefined && dataTableId === undefined && permissions === undefined
			? { key, kind, workflowId }
			: { denied: true, reason: `Binding "${key}": kind "workflow" takes workflowId only.` };
	}
	return dataTableId !== undefined && permissions !== undefined && workflowId === undefined
		? { key, kind, dataTableId, permissions }
		: {
				denied: true,
				reason: `Binding "${key}": kind "dataTable" takes dataTableId and permissions ("read", "write") only.`,
			};
}

async function describeWorkflowBind(
	context: InstanceAiContext,
	app: BoundApp,
	bindings: WorkflowBinding[],
): Promise<BindDescription> {
	const appService = requireAppService(context);
	const lines = await Promise.all(
		bindings.map(
			async ({ key, workflowId }) =>
				`Connect workflow "${await resolveWorkflowName(context, workflowId)}" (${workflowId}) to app "${app.name}" as "${key}"`,
		),
	);
	// One line: the card renders the message as plain HTML text, which folds newlines.
	const message = `${lines.join('; ')} (callable by anyone with the app URL)`;
	// The structured card shows one binding. A multi-binding call, or a workflow the
	// preview cannot resolve (the write refuses it with the reason), gets the plain text.
	const [described] =
		bindings.length === 1 ? (await appService.previewBindings(app.id, bindings)).bindings : [];
	if (!described || !isWorkflowBinding(described)) return { message };
	return {
		message,
		appBinding: {
			kind: 'workflow',
			appId: app.id,
			appName: app.name,
			appNamespace: app.namespace,
			workflowId: described.workflowId,
			workflowName: described.name,
			key: described.key,
		},
	};
}

async function describeDataTableBind(
	context: InstanceAiContext,
	app: BoundApp,
	bindings: DataTableBinding[],
): Promise<BindDescription> {
	// The preview is the one source of a table's name; a table it cannot resolve reads as its key.
	const described = (await requireAppService(context).previewBindings(app.id, bindings)).bindings;
	const nameOf = (key: string) => described.find((binding) => binding.key === key)?.name ?? key;
	const lines = bindings.map(
		({ key, dataTableId, permissions }) =>
			`Connect data table "${nameOf(key)}" (${dataTableId}) to app "${app.name}" as "${key}" with ${permissions.join(' and ')} access`,
	);
	const message = `${lines.join('; ')} (anyone with the app URL gets this access)`;
	const [only] = described;
	if (bindings.length !== 1 || !only || !isDataTableBinding(only)) return { message };
	return {
		message,
		appBinding: {
			kind: 'dataTable',
			appId: app.id,
			appName: app.name,
			appNamespace: app.namespace,
			dataTableId: only.dataTableId,
			dataTableName: only.name,
			key: only.key,
			permissions: only.permissions,
			projectId: app.projectId,
		},
	};
}

/**
 * Upsert by key: a binding with an existing key replaces it, the others stay. A bind
 * exposes a workflow or a data table to anyone with the app's URL, so it asks the user
 * first; one card per call, so a call binds one kind.
 */
async function handleBind(
	context: InstanceAiContext,
	input: BindInput,
	ctx: ConfirmationToolContext,
) {
	// The flattened schema the model sees makes every field optional, so the guard lives here.
	if (!input.bindings?.length) {
		return {
			denied: true,
			reason:
				'Pass at least one binding as { key, kind: "workflow", workflowId } or { key, kind: "dataTable", dataTableId, permissions }.',
		};
	}
	const bindings: AppBinding[] = [];
	for (const flat of input.bindings) {
		const binding = toAppBinding(flat);
		if ('denied' in binding) return binding;
		bindings.push(binding);
	}
	const workflows = bindings.filter((b): b is WorkflowBinding => b.kind === 'workflow');
	const tables = bindings.filter((b): b is DataTableBinding => b.kind === 'dataTable');
	if (workflows.length > 0 && tables.length > 0) {
		return { denied: true, reason: 'Bind workflows and data tables in separate calls.' };
	}
	const app = await requireAppService(context).get(input.appId);

	const denied =
		tables.length > 0
			? await requireBindApproval(
					context,
					ctx,
					'bindAppDataTable',
					async () => await describeDataTableBind(context, app, tables),
				)
			: await requireBindApproval(
					context,
					ctx,
					'bindAppWorkflow',
					async () => await describeWorkflowBind(context, app, workflows),
				);
	if (denied) return denied;

	const replaced = new Set(bindings.map((binding) => binding.key));
	return await replaceBindings(
		context,
		app.id,
		app.namespace,
		(current) => [...current.filter((binding) => !replaced.has(binding.key)), ...bindings],
		ctx.abortSignal,
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

/**
 * Lists and re-describes the bindings. The types follow the current resources (a
 * published trigger, a new execution sample, a changed table column), so the file is
 * rewritten here too.
 */
async function handleBindings(
	context: InstanceAiContext,
	input: BindingsInput,
	abortSignal?: AbortSignal,
) {
	const appService = requireAppService(context);
	const { workspace } = requireSandbox(context, abortSignal);
	const app = await appService.get(input.appId);
	const { bindings, warnings } = await appService.getBindings(app.id);
	await writeBindingsTypes(workspace, app.namespace, bindings, abortSignal);
	return { appId: app.id, bindings, typesPath: BINDINGS_TYPES_PATH, warnings };
}

async function readTarball(
	workspace: NonNullable<InstanceAiContext['appWorkspace']>,
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
			publishSchema,
			restoreSchema,
			addComponentSchema,
			bindSchema,
			unbindSchema,
			bindingsSchema,
		]),
	);

	return new Tool(APPS_TOOL_ID)
		.description(
			'Create, restore, bind and publish user-facing web apps served by n8n at /apps/<namespace>/. ' +
				'Load the `app-builder` skill via `load_skill` before calling this tool. ' +
				"`create` registers the app, copies a starter template into apps/<namespace>/ in the app's own sandbox and installs its dependencies; " +
				"edit the files there with the workspace tools and `sandbox: 'app'`, and the live preview updates by itself. Never build to check your work. " +
				'Call `publish` only when the user asks to publish, deploy or share the app: the user confirms, then n8n builds the current source, stores a version and updates /apps/<namespace>/. ' +
				'`publish` returns the published `url` on success, `{ denied }` when the user declines, or `{ error, stage, message, log }` to fix and retry. ' +
				"`restore` fills apps/<namespace>/ for an existing app when the app's sandbox does not have it yet: it unpacks the stored source, or copies the starter template when the app has no source (`scaffolded: true`). " +
				"`add-component` copies a component from this app-builder skill's own catalog (built on @ark-ui/vue) into src/components/ui/ — `create` uses it for the two the starter page needs, and every other component goes through it too. " +
				'`bind` lets the app call n8n workflows by key through `@n8n/app-sdk` (`n8n.workflows.run(key, input)`) and read or write data table rows (`n8n.tables.<key>.list/insert/update/delete`): ' +
				'pass `{ key, kind: "workflow", workflowId }` or `{ key, kind: "dataTable", dataTableId, permissions: ["read", "write"] }` entries (one kind per call), and it rewrites src/n8n-bindings.d.ts with the input and row types. ' +
				'It asks the user for approval first: every app is public, so a bound workflow or table is reachable by anyone with the app URL. ' +
				'`unbind` removes a key; `bindings` lists the current ones and rewrites the types (call it after a bound table changes columns). Bind before writing code that uses a workflow or table.',
		)
		.input(inputSchema)
		.suspend(confirmationSuspendSchema)
		.resume(instanceAiApprovalResumeSchema)
		.handler(async (input: AppsInput, ctx) => {
			switch (input.action) {
				case 'create':
					return await handleCreate(context, input, ctx.abortSignal);
				case 'publish':
					return await handlePublish(context, input, ctx);
				case 'restore':
					return await handleRestore(context, input, ctx.abortSignal);
				case 'add-component':
					return await handleAddComponent(context, input, ctx.abortSignal);
				case 'bind':
					return await handleBind(context, input, ctx);
				case 'unbind':
					return await handleUnbind(context, input, ctx.abortSignal);
				case 'bindings':
					return await handleBindings(context, input, ctx.abortSignal);
			}
		})
		.build();
}
