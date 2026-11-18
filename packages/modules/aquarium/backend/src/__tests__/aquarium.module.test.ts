import { LifecycleMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AquariumActivityService } from '../aquarium-activity.service';
import { AquariumModule } from '../aquarium.module';

describe('AquariumModule', () => {
	it('registers the module entrypoint for main instances only', () => {
		const entry = Container.get(ModuleMetadata).get('aquarium');

		expect(entry?.class).toBe(AquariumModule);
		expect(entry?.instanceTypes).toEqual(['main']);
	});

	it('listens to the start, resume and end of runs', () => {
		const events = Container.get(LifecycleMetadata)
			.getHandlers()
			.filter((handler) => handler.handlerClass.name === AquariumActivityService.name)
			.map((handler) => handler.eventName);

		expect(events).toEqual([
			'workflowExecuteBefore',
			'workflowExecuteResume',
			'workflowExecuteAfter',
		]);
	});
});
