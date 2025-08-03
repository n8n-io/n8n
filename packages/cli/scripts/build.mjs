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

if (publicApiEnabled) {
	createPublicApiDirectory();
	copySwaggerTheme();
	bundleOpenApiSpecs();
	copyYamlSpecFiles();
}

function generateUserManagementEmailTemplates() {
	const sourceDir = path.resolve(ROOT_DIR, 'src', 'user-management', 'email', 'templates');
	const destinationDir = path.resolve(ROOT_DIR, 'dist', 'user-management', 'email', 'templates');

	shell.mkdir('-p', destinationDir);

	const templates = glob.sync('*.mjml', { cwd: sourceDir });
	const templatesToProcess = templates.filter(template => !template.startsWith('_'));
	
	if (templatesToProcess.length > 0) {
		console.log(`Processing ${templatesToProcess.length} MJML email templates...`);
		
		templatesToProcess.forEach((template, index) => {
			const source = path.resolve(sourceDir, template);
			const destination = path.resolve(destinationDir, template.replace(/\.mjml$/, '.handlebars'));
			const command = `pnpm mjml --output "${destination}" "${source}"`;
			
			console.log(`[${index + 1}/${templatesToProcess.length}] Processing ${template}...`);
			const result = shell.exec(command, { silent: true });
			
			if (result.code !== 0) {
				console.error(`Error processing ${template}:`, result.stderr);
			} else {
				console.log(`✓ Generated ${template.replace(/\.mjml$/, '.handlebars')}`);
			}
		});
		
		console.log('✅ Email template processing completed');
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

function bundleOpenApiSpecs() {
	const publicApiDir = path.resolve(ROOT_DIR, 'src', 'public-api');

	const specPaths = shell
		.find(publicApiDir)
		.reduce((acc, cur) => {
			return cur.endsWith(SPEC_FILENAME) ? [...acc, path.relative('./src', cur)] : acc;
		}, []);
		
	if (specPaths.length > 0) {
		console.log(`Bundling ${specPaths.length} OpenAPI specification(s)...`);
		
		specPaths.forEach((specPath, index) => {
			const distSpecPath = path.resolve(ROOT_DIR, 'dist', specPath);
			const command = `pnpm openapi bundle src/${specPath} --output "${distSpecPath}"`;
			
			console.log(`[${index + 1}/${specPaths.length}] Bundling ${specPath}...`);
			const result = shell.exec(command, { silent: true });
			
			if (result.code !== 0) {
				console.error(`Error bundling ${specPath}:`, result.stderr);
			} else {
				console.log(`✓ Bundled ${specPath}`);
			}
		});
		
		console.log('✅ OpenAPI specification bundling completed');
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

function copyYamlSpecFiles() {
	const sourceDir = path.resolve(ROOT_DIR, 'src', 'public-api', 'v1');
	const destDir = path.resolve(ROOT_DIR, 'dist', 'public-api', 'v1');
	
	console.log('Copying YAML specification files...');
	
	const yamlFiles = glob.sync('{handlers,shared}/**/spec/**/*.yml', { cwd: sourceDir });
	
	yamlFiles.forEach((yamlFile) => {
		const sourcePath = path.resolve(sourceDir, yamlFile);
		const destPath = path.resolve(destDir, yamlFile);
		
		shell.mkdir('-p', path.dirname(destPath));
		shell.cp(sourcePath, destPath);
	});
	
	console.log(`Copied ${yamlFiles.length} YAML specification files`);
}
