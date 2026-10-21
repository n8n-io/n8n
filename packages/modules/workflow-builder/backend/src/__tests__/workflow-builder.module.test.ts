import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowBuilderSession } from '../index';
import { WorkflowBuilderModule } from '../workflow-builder.module';

describe('WorkflowBuilderModule', () => {
	it('registers the main instance entrypoint with the public entity', async () => {
		expect(Container.get(ModuleMetadata).get('workflow-builder')).toMatchObject({
			class: WorkflowBuilderModule,
			instanceTypes: ['main'],
		});
		expect(await new WorkflowBuilderModule().entities()).toEqual([WorkflowBuilderSession]);
	});
});
