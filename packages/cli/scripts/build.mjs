import path from 'path';
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import shell from 'shelljs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { rawTimeZones } from '@vvo/tzdb';
import glob from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SPEC_FILENAME = 'openapi.yml';
const SPEC_THEME_FILENAME = 'swagger-theme.css';

const YAML_STRINGIFY_OPTS = { singleQuote: true, aliasDuplicateObjects: false, lineWidth: 0 };

const publicApiEnabled = process.env.N8N_PUBLIC_API_DISABLED !== 'true';

generateUserManagementEmailTemplates();
generateTimezoneData();
copyAgentIntegrationAssets();

if (publicApiEnabled) {
	createPublicApiDirectory();
	copySwaggerTheme();

	await buildPublicApiSpec();
}

function generateUserManagementEmailTemplates() {
	const sourceDir = path.resolve(ROOT_DIR, 'src', 'user-management', 'email', 'templates');
	const destinationDir = path.resolve(ROOT_DIR, 'dist', 'user-management', 'email', 'templates');

	shell.mkdir('-p', destinationDir);

	const templates = glob.sync('*.mjml', { cwd: sourceDir }).filter((t) => !t.startsWith('_'));

	// One mjml process for all templates: each `pnpm mjml` start costs about 0.3s.
	// With several inputs, mjml writes `<name>.html` into the output directory.
	const sources = templates.map((template) => `"${path.resolve(sourceDir, template)}"`).join(' ');
	const result = shell.exec(`pnpm mjml ${sources} --output "${destinationDir}${path.sep}"`, {
		silent: false,
	});
	if (result.code !== 0) {
		throw new Error(`mjml failed to compile the email templates (exit code ${result.code})`);
	}

	for (const template of templates) {
		const name = template.replace(/\.mjml$/, '');
		const compiled = path.resolve(destinationDir, `${name}.html`);
		if (!existsSync(compiled)) {
			throw new Error(`mjml did not write ${compiled}`);
		}
		shell.mv(compiled, path.resolve(destinationDir, `${name}.handlebars`));
	}

	shell.cp(path.resolve(sourceDir, 'n8n-logo.png'), destinationDir);
}

function createPublicApiDirectory() {
	const publicApiDirectory = path.resolve(ROOT_DIR, 'dist', 'public-api', 'v1');
	if (!existsSync(publicApiDirectory)) {
		console.log('Creating directory', publicApiDirectory);
		mkdirSync(publicApiDirectory, { recursive: true });
	}
}

function copySwaggerTheme() {
	const swaggerTheme = {
		source: path.resolve(ROOT_DIR, 'src', 'public-api', SPEC_THEME_FILENAME),
		destination: path.resolve(ROOT_DIR, 'dist', 'public-api'),
	};

	shell.cp('-r', swaggerTheme.source, swaggerTheme.destination);
}

// Builds the v1 spec from two sources:
// - the hand-written routes (eov) at `openapi.yml`
// - the full `@PublicApiController` decorated routes at `openapi.decorator-routes.generated.yml`
async function buildPublicApiSpec() {
	const v1Dir = path.resolve(ROOT_DIR, 'src', 'public-api', 'v1');
	const { generateDocs, mergeDecoratorDocument, DECORATOR_ROOT_FILENAME } =
		await loadOpenApiGenerator();

	// 1. Generate decorated route OpenAPI specs from source.
	generateDocs(v1Dir);

	// 2. Bundle both sources in one redocly process. With several inputs, redocly
	// writes each bundle into the output directory under its source file name.
	const v1DistDir = path.resolve(ROOT_DIR, 'dist', 'public-api', 'v1');
	bundleSpecs(
		[path.join(v1Dir, SPEC_FILENAME), path.join(v1Dir, DECORATOR_ROOT_FILENAME)],
		v1DistDir,
	);

	const eovDistSpec = path.join(v1DistDir, SPEC_FILENAME);
	const decoratorDistSpec = path.join(v1DistDir, DECORATOR_ROOT_FILENAME);

	// 3. Merge the two specs into a single OpenAPI document, writing back to the eov spec path.
	const eovDoc = parseYaml(readFileSync(eovDistSpec, 'utf8'));
	const decoratorDoc = parseYaml(readFileSync(decoratorDistSpec, 'utf8'));

	// 4. Merge the two specs and write back to the eov spec path.
	writeFileSync(
		eovDistSpec,
		stringifyYaml(mergeDecoratorDocument(eovDoc, decoratorDoc), YAML_STRINGIFY_OPTS),
	);

	// 5. Cleanup the decorator spec.
	rmSync(decoratorDistSpec);
}

// Imports the already-compiled generator from dist rather than the .ts source — by the time
// build:data runs, `tsc` has already emitted it and build.mjs has no TS loader.
async function loadOpenApiGenerator() {
	const generatorPath = path.resolve(
		ROOT_DIR,
		'dist',
		'public-api',
		'v1',
		'openapi-gen',
		'generate.js',
	);
	if (!existsSync(generatorPath)) {
		throw new Error(
			`OpenAPI doc generator not found at ${generatorPath} — did the TypeScript build run before build:data?`,
		);
	}

	const generator = await import(pathToFileURL(generatorPath).href);
	for (const name of ['generateDocs', 'mergeDecoratorDocument', 'DECORATOR_ROOT_FILENAME']) {
		if (generator[name] === undefined) {
			throw new Error(
				`OpenAPI doc generator at ${generatorPath} is missing export '${name}' — its contract may have changed.`,
			);
		}
	}
	return generator;
}

// Bundles specs through redocly, resolving all $refs. Each source becomes one file in `distDir`.
function bundleSpecs(sourcePaths, distDir) {
	const distPaths = sourcePaths.map((sourcePath) => path.join(distDir, path.basename(sourcePath)));
	// Remove old output, so that the check below cannot pass on a stale file.
	for (const distPath of distPaths) rmSync(distPath, { force: true });

	const sources = sourcePaths.map((sourcePath) => `"${sourcePath}"`).join(' ');
	const result = shell.exec(`pnpm openapi bundle ${sources} --output "${distDir}"`, {
		silent: true,
	});
	if (result.code !== 0) {
		throw new Error(
			`redocly failed to bundle ${sourcePaths.join(', ')}:\n${result.stderr || result.stdout}`,
		);
	}
	for (const [i, distPath] of distPaths.entries()) {
		if (!existsSync(distPath)) {
			throw new Error(`redocly did not write the bundle for ${sourcePaths[i]} to ${distPath}`);
		}
	}
}

function copyAgentIntegrationAssets() {
	// tsc emits no non-TS files, so every platform's assets are copied here.
	// Discovered rather than listed: a platform that adds an assets directory
	// otherwise works in dev, where they are read from src, and ships without
	// them.
	const platformsRoot = path.resolve(
		ROOT_DIR,
		'src',
		'modules',
		'agents',
		'integrations',
		'platforms',
	);
	const sourceDirs = glob.sync('*/assets', {
		cwd: platformsRoot,
		onlyDirectories: true,
		absolute: false,
	});

	if (sourceDirs.length === 0) {
		throw new Error(`No agent integration assets directories found under: ${platformsRoot}`);
	}

	for (const relativeDir of sourceDirs) {
		const sourceDir = path.resolve(platformsRoot, relativeDir);
		const destinationDir = path.resolve(
			ROOT_DIR,
			'dist',
			'modules',
			'agents',
			'integrations',
			'platforms',
			relativeDir,
		);

		shell.rm('-rf', destinationDir);
		shell.mkdir('-p', path.dirname(destinationDir));
		shell.cp('-R', sourceDir, destinationDir);
		if (!existsSync(destinationDir)) {
			throw new Error(`Failed to copy agent integration assets to: ${destinationDir}`);
		}
	}
}

function generateTimezoneData() {
	const timezones = ['Etc/UTC', 'Etc/GMT', ...rawTimeZones.map((tz) => tz.name)];
	const data = timezones.sort().reduce((acc, name) => {
		acc[name] = name.replaceAll('_', ' ');
		return acc;
	}, {});
	writeFileSync(path.resolve(ROOT_DIR, 'dist/timezones.json'), JSON.stringify({ data }));
}
