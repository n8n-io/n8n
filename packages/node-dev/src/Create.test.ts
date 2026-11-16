import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';

import { createTemplate } from './Create';

describe('createTemplate', () => {
	it.each(['credentials', 'execute', 'trigger', 'webhook'])(
		'creates the %s template with all placeholders replaced',
		async (template) => {
			const directory = await mkdtemp(join(tmpdir(), 'n8n-node-dev-'));
			onTestFinished(async () => await rm(directory, { recursive: true, force: true }));
			const sourceFilePath = join(__dirname, '../templates', template, 'simple.ts');
			const destinationFilePath = join(directory, 'ExampleService.ts');
			const source = await readFile(sourceFilePath, 'utf8');

			await createTemplate(sourceFilePath, destinationFilePath, {
				ClassNameReplace: 'ExampleService',
				DisplayNameReplace: 'Example Service',
				N8nNameReplace: 'exampleService',
				NodeDescriptionReplace: 'Process example data',
			});

			const generated = await readFile(destinationFilePath, 'utf8');
			if (template === 'credentials') {
				expect(generated).toContain('export class ExampleService implements ICredentialType');
				expect(generated).toContain("name = 'exampleService'");
				expect(generated).toContain("displayName = 'Example Service'");
			} else {
				expect(generated).toContain('export class ExampleService implements INodeType');
				expect(generated).toContain("name: 'exampleService'");
				expect(generated).toContain("displayName: 'Example Service'");
				expect(generated).toContain("description: 'Process example data'");
				expect(generated).toMatch(/defaults:\s*\{\s*name: 'Example Service'/);
			}
			expect(
				generated.match(/(?:ClassName|DisplayName|N8nName|NodeDescription)Replace/),
			).toBeNull();
			expect(await readFile(sourceFilePath, 'utf8')).toBe(source);
		},
	);
});
