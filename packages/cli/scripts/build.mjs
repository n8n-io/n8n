import path from 'path';
import { fileURLToPath } from 'url';
import shell from 'shelljs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function copyUserManagementEmailTemplates() {
	const templates = {
		source: path.resolve(rootDir, 'src', 'UserManagement', 'email', 'templates'),
		destination: path.resolve(rootDir, 'dist', 'UserManagement', 'email'),
	};

	shell.cp('-r', templates.source, templates.destination);
}

function copySwaggerTheme() {
	const themeFilename = 'swaggerTheme.css';
	const swaggerTheme = {
		source: path.resolve(rootDir, 'src', 'PublicApi', themeFilename),
		destination: path.resolve(rootDir, 'dist', 'PublicApi'),
	};

	shell.cp('-r', swaggerTheme.source, swaggerTheme.destination);
}

function bundleOpenApiSpecs() {
	const specFileName = 'openapi.yml';
	const publicApiDir = path.resolve(rootDir, 'src', 'PublicApi');

	shell
		.find(publicApiDir)
		.reduce(
			(acc, cur) => (cur.endsWith(specFileName) ? [...acc, path.relative('./src', cur)] : acc),
			[],
		)
		.forEach((specPath) => {
			const distSpecPath = path.resolve(rootDir, 'dist', specPath);
			const command = `npm run swagger -- bundle src/${specPath} --type yaml --outfile ${distSpecPath}`;
			shell.exec(command, { silent: true });
		});
}

function copyUIAssets() {
	const uiDistDir = path.join(path.dirname(require.resolve('n8n-editor-ui')), 'dist');
	shell.cp('-r', uiDistDir, path.resolve(rootDir, 'dist', 'editor-ui'));
}

copyUserManagementEmailTemplates();
copySwaggerTheme();
bundleOpenApiSpecs();
copyUIAssets();
