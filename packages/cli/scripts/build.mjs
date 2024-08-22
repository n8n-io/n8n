import path from 'path';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import shell from 'shelljs';
import { rawTimeZones } from '@vvo/tzdb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SPEC_FILENAME = 'openapi.yml';
const SPEC_THEME_FILENAME = 'swaggerTheme.css';

const publicApiEnabled = process.env.N8N_PUBLIC_API_DISABLED !== 'true';

copyUserManagementEmailTemplates();
generateTimezoneData();

if (publicApiEnabled) {
	copySwaggerTheme();
	bundleOpenApiSpecs();
}

function copyUserManagementEmailTemplates() {
	const templates = {
		source: path.resolve(ROOT_DIR, 'src', 'user-management', 'email', 'templates'),
		destination: path.resolve(ROOT_DIR, 'dist', 'user-management', 'email'),
	};

	shell.cp('-r', templates.source, templates.destination);
}

function copySwaggerTheme() {
	const swaggerTheme = {
		source: path.resolve(ROOT_DIR, 'src', 'PublicApi', SPEC_THEME_FILENAME),
		destination: path.resolve(ROOT_DIR, 'dist', 'PublicApi'),
	};

	shell.cp('-r', swaggerTheme.source, swaggerTheme.destination);
}

function bundleOpenApiSpecs() {
	const publicApiDir = path.resolve(ROOT_DIR, 'src', 'PublicApi');

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
	const timezones = rawTimeZones.reduce((acc, tz) => {
		acc[tz.name] = tz.name.replaceAll('_', ' ');
		return acc;
	}, {});
	writeFileSync(path.resolve(ROOT_DIR, 'dist/timezones.json'), JSON.stringify({ data: timezones }));
}
