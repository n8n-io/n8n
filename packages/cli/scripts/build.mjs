import path from 'path';
import { fileURLToPath } from 'url';
import shell from 'shelljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SPEC_FILENAME = 'openapi.yml';
const SPEC_THEME_FILENAME = 'swaggerTheme.css';

const userManagementEnabled = process.env.N8N_USER_MANAGEMENT_DISABLED !== 'true';
const publicApiEnabled = process.env.N8N_PUBLIC_API_DISABLED !== 'true';

shell.rm('-rf', path.resolve(ROOT_DIR, 'dist'));

const tscCompilation = shell.exec('tsc', { silent: true })
if (tscCompilation.code !== 0) {
	shell.echo('Typescript Compilation failed:');
	shell.echo(tscCompilation.stdout);
	shell.exit(1);
}

if (userManagementEnabled) {
	copyUserManagementEmailTemplates();
}

if (publicApiEnabled) {
	copySwaggerTheme();
	bundleOpenApiSpecs();
}

function copyUserManagementEmailTemplates(rootDir = ROOT_DIR) {
	const templates = {
		source: path.resolve(rootDir, 'src', 'UserManagement', 'email', 'templates'),
		destination: path.resolve(rootDir, 'dist', 'src', 'UserManagement', 'email'),
	};

	shell.cp('-r', templates.source, templates.destination);
}

function copySwaggerTheme(rootDir = ROOT_DIR, themeFilename = SPEC_THEME_FILENAME) {
	const swaggerTheme = {
		source: path.resolve(rootDir, 'src', 'PublicApi', themeFilename),
		destination: path.resolve(rootDir, 'dist', 'src', 'PublicApi'),
	};

	shell.cp('-r', swaggerTheme.source, swaggerTheme.destination);
}

function bundleOpenApiSpecs(rootDir = ROOT_DIR, specFileName = SPEC_FILENAME) {
	const publicApiDir = path.resolve(rootDir, 'src', 'PublicApi');

	shell
		.find(publicApiDir)
		.reduce((acc, cur) => {
			return cur.endsWith(specFileName) ? [...acc, path.relative('.', cur)] : acc;
		}, [])
		.forEach((specPath) => {
			const distSpecPath = path.resolve(rootDir, 'dist', specPath);
			const command = `swagger-cli bundle ${specPath} --type yaml --outfile ${distSpecPath}`;
			shell.exec(command, { silent: true });
		});
}
