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
copyInstanceAiExamplesData();
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

	const templates = glob.sync('*.mjml', { cwd: sourceDir });
	templates.forEach((template) => {
		if (template.startsWith('_')) return;
		const source = path.resolve(sourceDir, template);
		const destination = path.resolve(destinationDir, template.replace(/\.mjml$/, '.handlebars'));
		const command = `pnpm mjml --output "${destination}" "${source}"`;
		shell.exec(command, { silent: false });
	});

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

	// 2. Bundle both sources.
	const v1DistDir = path.resolve(ROOT_DIR, 'dist', 'public-api', 'v1');

	const eovDistSpec = path.join(v1DistDir, SPEC_FILENAME);
	bundleSpec(path.join(v1Dir, SPEC_FILENAME), eovDistSpec);

	const decoratorDistSpec = path.join(v1DistDir, DECORATOR_ROOT_FILENAME);
	bundleSpec(path.join(v1Dir, DECORATOR_ROOT_FILENAME), decoratorDistSpec);

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

// Bundles a spec through redocly, resolving all $refs into a single file at `distPath`.
function bundleSpec(sourcePath, distPath) {
	const result = shell.exec(`pnpm openapi bundle "${sourcePath}" --output "${distPath}"`, {
		silent: true,
	});
	if (result.code !== 0) {
		throw new Error(`redocly failed to bundle ${sourcePath}:\n${result.stderr || result.stdout}`);
	}
}

// Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment.
// The data lives in the frontend source tree but is read at runtime by the CLI, so it
// must be bundled into `dist` to ship with the published package.
function copyInstanceAiExamplesData() {
	const source = path.resolve(
		ROOT_DIR,
		'..',
		'frontend',
		'editor-ui',
		'src',
		'experiments',
		'instanceAiTemplateExamples',
		'instance-ai-examples.data.json',
	);

	if (!existsSync(source)) {
		throw new Error(`Instance AI examples data file not found: ${source}`);
	}

	const destination = path.resolve(ROOT_DIR, 'dist', 'instance-ai-examples.data.json');
	shell.cp(source, destination);
	if (!existsSync(destination)) {
		throw new Error(`Failed to copy Instance AI examples data file to: ${destination}`);
	}
}

function copyAgentIntegrationAssets() {
	const sourceDir = path.resolve(
		ROOT_DIR,
		'src',
		'modules',
		'agents',
		'integrations',
		'platforms',
		'slack',
		'assets',
	);
	const destinationDir = path.resolve(
		ROOT_DIR,
		'dist',
		'modules',
		'agents',
		'integrations',
		'platforms',
		'slack',
		'assets',
	);

	if (!existsSync(sourceDir)) {
		throw new Error(`Agent integration assets directory not found: ${sourceDir}`);
	}
	shell.rm('-rf', destinationDir);
	shell.mkdir('-p', path.dirname(destinationDir));
	shell.cp('-R', sourceDir, destinationDir);
	if (!existsSync(destinationDir)) {
		throw new Error(`Failed to copy agent integration assets to: ${destinationDir}`);
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
