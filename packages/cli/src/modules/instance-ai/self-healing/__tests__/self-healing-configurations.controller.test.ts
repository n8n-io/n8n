import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { SelfHealingConfigurationsController } from '../self-healing-configurations.controller';

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	SelfHealingConfigurationsController as never,
);

it.each([...metadata.routes.entries()])(
	'%s requires existing project settings permission',
	(_name, route) => {
		expect(route.accessScope).toMatchObject({ scope: 'project:update', globalOnly: false });
		expect(route.skipAuth).not.toBe(true);
	},
);
