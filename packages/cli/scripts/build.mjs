import path from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import shell from 'shelljs';
import { rawTimeZones } from '@vvo/tzdb';
import glob from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SPEC_FILENAME = 'openapi.yml';
const SPEC_THEME_FILENAME = 'swagger-theme.css';

const publicApiEnabled = process.env.N8N_PUBLIC_API_DISABLED !== 'true';

generateUserManagementEmailTemplates();
generateTimezoneData();
copyChatAssets();
copyOpenApiYml();

if (publicApiEnabled) {
	createPublicApiDirectory();
	copySwaggerTheme();
	bundleOpenApiSpecs();
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
		const command = `pnpm mjml --output ${destination} ${source}`;
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

function bundleOpenApiSpecs() {
	const publicApiDir = path.resolve(ROOT_DIR, 'src', 'public-api');

	shell
		.find(publicApiDir)
		.reduce((acc, cur) => {
			return cur.endsWith(SPEC_FILENAME) ? [...acc, path.relative('./src', cur)] : acc;
		}, [])
		.forEach((specPath) => {
			const distSpecPath = path.resolve(ROOT_DIR, 'dist', specPath);
			const command = `pnpm openapi bundle src/${specPath} --output ${distSpecPath}`;

			shell.exec(command, { silent: true });
		});
}

function generateTimezoneData() {
	const timezones = ['Etc/UTC', 'Etc/GMT', ...rawTimeZones.map((tz) => tz.name)];
	const data = timezones.sort().reduce((acc, name) => {
		acc[name] = name.replaceAll('_', ' ');
		return acc;
	}, {});
	writeFileSync(path.resolve(ROOT_DIR, 'dist/timezones.json'), JSON.stringify({ data }));
}

function copyChatAssets() {
	const chatAssetsSource = path.resolve(ROOT_DIR, '..', 'frontend', '@n8n', 'chat', 'dist');
	const chatAssetsDestination = path.resolve(ROOT_DIR, 'dist', 'chat');

	if (existsSync(chatAssetsSource)) {
		console.log('Copying chat assets from', chatAssetsSource, 'to', chatAssetsDestination);
		shell.mkdir('-p', chatAssetsDestination);
		shell.cp('-r', path.join(chatAssetsSource, '*'), chatAssetsDestination);
		console.log('✅ Chat assets copied successfully');
	} else {
		console.warn('⚠️ Chat assets not found at', chatAssetsSource);
		console.warn('   Run "pnpm --filter @n8n/chat build" first');
	}
}

function copyOpenApiYml() {
	const openApiSource = path.resolve(ROOT_DIR, 'src', 'public-api', 'v1', 'openapi.yml');
	const openApiDestination = path.resolve(ROOT_DIR, 'dist', 'public-api', 'v1', 'openapi.yml');

	if (existsSync(openApiSource)) {
		console.log('Copying openapi.yml from', openApiSource, 'to', openApiDestination);
		shell.mkdir('-p', path.dirname(openApiDestination));
		shell.cp(openApiSource, openApiDestination);
		console.log('✅ OpenAPI specification copied successfully');
	} else {
		console.warn('⚠️ openapi.yml not found at:', openApiSource);
		console.warn('   API documentation may not be available');
	}
}
