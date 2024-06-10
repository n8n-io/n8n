import { RestController, Get } from '@/decorators';

import { eventNamesAll } from './EventMessageClasses';

@RestController('/eventbus')
export class EventBusController {
	@Get('/eventnames')
	async getEventNames(): Promise<string[]> {
		return eventNamesAll;
	}
}
