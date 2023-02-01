import path from 'path';
import { fileURLToPath } from 'url';
import shell from 'shelljs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SPEC_FILENAME = 'openapi.yml';
const SPEC_THEME_FILENAME = 'swaggerTheme.css';
const EDITOR_UI_DIST_DIR = path.join(path.dirname(require.resolve('n8n-editor-ui')), 'dist');

const userManagementEnabled = process.env.N8N_USER_MANAGEMENT_DISABLED !== 'true';
const publicApiEnabled = process.env.N8N_PUBLIC_API_DISABLED !== 'true';
const uiEnabled = process.env.N8N_DISABLE_UI !== 'true';

if (userManagementEnabled) {
	copyUserManagementEmailTemplates();
}

if (publicApiEnabled) {
	copySwaggerTheme();
	bundleOpenApiSpecs();
}

if (uiEnabled) {
	copyUIAssets();
}

function copyUserManagementEmailTemplates(rootDir = ROOT_DIR) {
	const templates = {
		source: path.resolve(rootDir, 'src', 'UserManagement', 'email', 'templates'),
		destination: path.resolve(rootDir, 'dist', 'UserManagement', 'email'),
	};

	shell.cp('-r', templates.source, templates.destination);
}

function copySwaggerTheme(rootDir = ROOT_DIR, themeFilename = SPEC_THEME_FILENAME) {
	const swaggerTheme = {
		source: path.resolve(rootDir, 'src', 'PublicApi', themeFilename),
		destination: path.resolve(rootDir, 'dist', 'PublicApi'),
	};

	shell.cp('-r', swaggerTheme.source, swaggerTheme.destination);
}

function bundleOpenApiSpecs(rootDir = ROOT_DIR, specFileName = SPEC_FILENAME) {
	const publicApiDir = path.resolve(rootDir, 'src', 'PublicApi');

	shell
		.find(publicApiDir)
		.reduce((acc, cur) => {
			return cur.endsWith(specFileName) ? [...acc, path.relative('./src', cur)] : acc;
		}, [])
		.forEach((specPath) => {
			const distSpecPath = path.resolve(rootDir, 'dist', specPath);
			const command = `npm run swagger -- bundle src/${specPath} --type yaml --outfile ${distSpecPath}`;
			shell.exec(command, { silent: true });
		});
}

function copyUIAssets(rootDir = ROOT_DIR) {
	shell.cp('-r', EDITOR_UI_DIST_DIR, path.resolve(rootDir, 'dist', 'editor-ui'));
}
