import { extensionManifestSchema } from '../src/schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, resolveConfig } from 'prettier';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const jsonSchema = zodToJsonSchema(extensionManifestSchema, {
	name: 'N8nExtensionSchema',
	nameStrategy: 'title',
});

(async () => {
	const filepath = 'schema.json';
	const schema = JSON.stringify(jsonSchema);
	const config = await resolveConfig(filepath);
	const formattedSchema = await format(schema, { ...config, filepath });
	await writeFile(resolve(rootDir, filepath), formattedSchema);
})();
