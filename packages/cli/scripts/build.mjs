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
// - the hand-written routes (eov) `openapi.yml`
// - the `@PublicApiController` decorator routes (generated from their DTOs/decorators)
async function buildPublicApiSpec() {
	const v1Dir = path.resolve(ROOT_DIR, 'src', 'public-api', 'v1');
	const { generateDocs, mergeDecoratorDocument, DECORATOR_ROOT_FILENAME } =
		await loadOpenApiGenerator();

	// 1. Regenerate the committed fragments and the decorator-routes root that $refs them.
	generateDocs(v1Dir);

	// 2. Bundle every hand-written spec into dist (resolving all $refs), as before.
	bundleHandWrittenSpecs();

	// 3. Merge the decorator-routed operations into the bundled v1 spec.
	const distV1Spec = path.resolve(ROOT_DIR, 'dist', 'public-api', 'v1', SPEC_FILENAME);
	const eovDoc = parseYaml(readFileSync(distV1Spec, 'utf8'));
	const decoratorDoc = bundleSpecToObject(path.join(v1Dir, DECORATOR_ROOT_FILENAME));
	writeFileSync(
		distV1Spec,
		stringifyYaml(mergeDecoratorDocument(eovDoc, decoratorDoc), YAML_STRINGIFY_OPTS),
	);
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

function bundleHandWrittenSpecs() {
	const publicApiDir = path.resolve(ROOT_DIR, 'src', 'public-api');

	shell
		.find(publicApiDir)
		.reduce((acc, cur) => {
			return cur.endsWith(SPEC_FILENAME) ? [...acc, path.relative('./src', cur)] : acc;
		}, [])
		.forEach((specPath) => {
			const distSpecPath = path.resolve(ROOT_DIR, 'dist', specPath);
			const command = `pnpm openapi bundle "src/${specPath}" --output "${distSpecPath}"`;

			shell.exec(command, { silent: true });
		});
}

// Bundles a single spec through redocly and returns the resolved document as an object.
function bundleSpecToObject(specPath) {
	const tmpOutput = path.resolve(ROOT_DIR, 'dist', 'public-api', 'v1', '_bundle.tmp.yml');
	const result = shell.exec(`pnpm openapi bundle "${specPath}" --output "${tmpOutput}"`, {
		silent: true,
	});
	if (result.code !== 0) {
		throw new Error(`redocly failed to bundle ${specPath}:\n${result.stderr || result.stdout}`);
	}
	const doc = parseYaml(readFileSync(tmpOutput, 'utf8'));
	rmSync(tmpOutput);
	return doc;
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

function generateTimezoneData() {
	const timezones = ['Etc/UTC', 'Etc/GMT', ...rawTimeZones.map((tz) => tz.name)];
	const data = timezones.sort().reduce((acc, name) => {
		acc[name] = name.replaceAll('_', ' ');
		return acc;
	}, {});
	writeFileSync(path.resolve(ROOT_DIR, 'dist/timezones.json'), JSON.stringify({ data }));
}
