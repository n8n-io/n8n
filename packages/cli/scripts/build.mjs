import path from 'path';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import shell from 'shelljs';
import { rawTimeZones } from '@vvo/tzdb';
import glob from 'fast-glob';
import { buildAgentLibraryBundle } from './bundle-agent-library.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SPEC_FILENAME = 'openapi.yml';
const SPEC_THEME_FILENAME = 'swagger-theme.css';

const publicApiEnabled = process.env.N8N_PUBLIC_API_DISABLED !== 'true';

generateUserManagementEmailTemplates();
generateTimezoneData();
generateBuildInfo();
await buildAgentLibraryBundle();

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

function bundleOpenApiSpecs() {
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

function generateTimezoneData() {
	const timezones = ['Etc/UTC', 'Etc/GMT', ...rawTimeZones.map((tz) => tz.name)];
	const data = timezones.sort().reduce((acc, name) => {
		acc[name] = name.replaceAll('_', ' ');
		return acc;
	}, {});
	writeFileSync(path.resolve(ROOT_DIR, 'dist/timezones.json'), JSON.stringify({ data }));
}

function generateBuildInfo() {
	const buildInfoPath = path.resolve(ROOT_DIR, 'dist/build-info.json');

	if (process.env.N8N_INCLUDE_BUILD_INFO !== 'true') {
		if (existsSync(buildInfoPath)) rmSync(buildInfoPath);
		return;
	}

	const git = (args) =>
		execSync(`git ${args}`, { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();

	try {
		const commitHash = process.env.N8N_BUILD_COMMIT_HASH || git('rev-parse --short HEAD');
		const branch = process.env.N8N_BUILD_BRANCH || git('rev-parse --abbrev-ref HEAD');
		const buildDate = process.env.N8N_BUILD_DATE || new Date().toISOString();

		const distDir = path.resolve(ROOT_DIR, 'dist');
		if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
		writeFileSync(buildInfoPath, JSON.stringify({ commitHash, branch, buildDate }));
	} catch (error) {
		console.warn(
			'[build-info] N8N_INCLUDE_BUILD_INFO=true but git metadata could not be read; skipping.',
			error.message,
		);
		if (existsSync(buildInfoPath)) rmSync(buildInfoPath);
	}
}
