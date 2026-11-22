import { ModuleRegistry } from '@n8n/backend-common';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import '../custom-nodes.module';

describe('CustomNodesModule', () => {
	it('is not a default module', () => {
		expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('custom-nodes');
	});

	it('runs on main, worker and webhook instances', () => {
		const entry = Container.get(ModuleMetadata)
			.getEntries()
			.find(([name]) => name === 'custom-nodes');

		expect(entry?.[1].instanceTypes).toEqual(['main', 'worker', 'webhook']);
	});
});
