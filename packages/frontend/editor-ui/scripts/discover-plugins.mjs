import { readdir, readFile, access } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ManifestValidator } from '@n8n/extension-sdk/validation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = resolve(__dirname, '../../../plugins');

async function fileExists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export async function discoverPlugins() {
	const validator = new ManifestValidator();
	const plugins = [];

	try {
		const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const pluginDir = resolve(PLUGINS_DIR, entry.name);
			const manifestPath = resolve(pluginDir, 'n8n.manifest.json');

			try {
				const manifestContent = await readFile(manifestPath, 'utf-8');
				const manifestData = JSON.parse(manifestContent);

				const result = validator.validate(manifestData);

				if (!result.valid) {
					console.error(`❌ Invalid manifest for ${entry.name}:`);
					result.errors.forEach((err) => {
						console.error(`   - ${err.message} (${err.field || 'unknown'})`);
					});
					continue;
				}

				if (result.warnings.length > 0) {
					console.warn(`!  Warnings for ${entry.name}:`);
					result.warnings.forEach((warn) => {
						console.warn(`   - ${warn.message} (${warn.field || 'unknown'})`);
					});
				}

				const resolvedName = `@n8n/plugin-${entry.name}`;

				// Check for entry points by file existence (convention over configuration)
				const hasFrontend = await fileExists(resolve(pluginDir, 'src/frontend/index.ts'));
				const hasBackend = await fileExists(resolve(pluginDir, 'src/backend/index.ts'));

				plugins.push({
					name: result.manifest.name,
					resolvedName,
					manifest: result.manifest,
					path: pluginDir,
					manifestPath,
					hasFrontend,
					hasBackend,
				});

				const entries = [
					hasFrontend && 'frontend',
					hasBackend && 'backend',
				].filter(Boolean).join(', ');

				console.log(`✓ Discovered plugin: ${resolvedName} [${entries || 'no entries'}]`);
			} catch (error) {
				if (error.code === 'ENOENT') {
					// No manifest file, skip silently
					continue;
				}
				console.error(`❌ Error loading manifest for ${entry.name}:`, error.message);
			}
		}

		return plugins;
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.warn('!  Plugins directory not found, no plugins to discover');
			return [];
		}
		throw error;
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	discoverPlugins()
		.then((plugins) => {
			console.log(`\n✓ Discovered ${plugins.length} plugin(s)\n`);
		})
		.catch((error) => {
			console.error('❌ Plugin discovery failed:', error);
			process.exit(1);
		});
}

