import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { KnowledgeModule } from '../knowledge.module';

describe('KnowledgeModule', () => {
	it('registers the module entrypoint under the name the registry loads', () => {
		expect(Container.get(ModuleMetadata).get('knowledge')?.class).toBe(KnowledgeModule);
	});

	it('is unlicensed and runs on every instance type', () => {
		const entry = Container.get(ModuleMetadata).get('knowledge');

		expect(entry?.licenseFlag).toBeUndefined();
		expect(entry?.instanceTypes).toBeUndefined();
	});

	it('registers no entities, so no migration is generated', async () => {
		await expect(new KnowledgeModule().entities()).resolves.toEqual([]);
	});

	it('initializes without side effects', async () => {
		await expect(new KnowledgeModule().init()).resolves.toBeUndefined();
	});
});
