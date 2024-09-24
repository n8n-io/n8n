import { Get, RestController } from '@/decorators';
import { AuthenticatedRequest } from '@/requests';

import { EventService } from './event.service';

@RestController('/events')
export class EventsController {
	constructor(private readonly eventService: EventService) {}

	@Get('/session-started')
	track(req: AuthenticatedRequest) {
		const pushRef = req.headers['push-ref'] as string;
		this.eventService.emit('session-started', { pushRef });
	}
}
