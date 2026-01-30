import { readdir, access } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CloudManifestValidator } from '@n8n/extension-sdk/cloud';
import { extractManifestFromSource } from './extract-extension-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = resolve(__dirname, '../../../cloud-extensions');

async function fileExists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export async function discoverExtensions() {
	const validator = new CloudManifestValidator();
	const extensions = [];

	try {
		const entries = await readdir(PLUGINS_DIR, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const extensionDir = resolve(PLUGINS_DIR, entry.name);
			const indexPath = resolve(extensionDir, 'src/index.ts');

			if (!(await fileExists(indexPath))) {
				continue;
			}

			try {
				const manifestData = await extractManifestFromSource(indexPath);

				if (!manifestData) {
					console.error(`❌ No manifest data found in ${entry.name}/src/index.ts`);
					continue;
				}

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

				const resolvedName = `@n8n/ce-${entry.name}`;

				extensions.push({
					name: result.manifest.name,
					resolvedName,
					path: extensionDir,
					locales: manifestData.locales || null,
				});

				console.log(`✓ Discovered extension: ${resolvedName}`);
			} catch (error) {
				console.error(`❌ Error loading extension ${entry.name}:`, error.message);
			}
		}

		return extensions;
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.warn('!  Extensions directory not found, no extensions to discover');
			return [];
		}
		throw error;
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	discoverExtensions()
		.then((extensions) => {
			console.log(`\n✓ Discovered ${extensions.length} extension(s)\n`);
		})
		.catch((error) => {
			console.error('❌ Extension discovery failed:', error);
			process.exit(1);
		});
}
