import { WorkflowBuilderSession } from '@n8n/backend-module-workflow-builder';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { packagedModules } from '../modules.manifest';

describe('packaged Workflow Builder', () => {
	it('loads the package entrypoint through the CLI manifest', async () => {
		const metadata = Container.get(ModuleMetadata);
		expect(metadata.get('workflow-builder')).toBeUndefined();

		const load = packagedModules['workflow-builder'];
		expect(load).toBeTypeOf('function');
		await load?.();

		const entry = metadata.get('workflow-builder');
		expect(entry?.instanceTypes).toEqual(['main']);
		const module = entry && Container.get(entry.class);
		expect(await module?.entities?.()).toEqual([WorkflowBuilderSession]);
	});
});
