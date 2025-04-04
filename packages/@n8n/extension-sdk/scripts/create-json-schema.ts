import { extensionManifestSchema } from '../src/schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

const __dirname = new URL('.', import.meta.url).pathname;
const rootDir = resolve(__dirname, '..');

const jsonSchema = zodToJsonSchema(extensionManifestSchema, {
	name: 'N8nExtensionSchema',
	nameStrategy: 'title',
});

(async () => {
	await writeFile(resolve(rootDir, 'schema.json'), JSON.stringify(jsonSchema, null, 2));
})();
