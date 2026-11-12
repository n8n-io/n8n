import { TrackPageHideEventRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import { findPageHideEvent } from '@n8n/telemetry';
import type { Response } from 'express';

import { Telemetry } from '@/telemetry';

/**
 * Emits events that the editor sends while the page hides or closes. The
 * telemetry SDK loses requests that start then, so the editor sends a
 * `keepalive` request here instead. This is a separate controller from the
 * public telemetry proxy, because every route here needs a signed-in user.
 */
@RestController('/telemetry')
export class PageHideTelemetryController {
	constructor(private readonly telemetry: Telemetry) {}

	@Post('/page-hide', { ipRateLimit: { limit: 60, windowMs: 60_000 } })
	track(req: AuthenticatedRequest, _res: Response, @Body payload: TrackPageHideEventRequestDto) {
		const event = findPageHideEvent(payload.event);
		if (!event) throw new BadRequestError('This event cannot be sent from the page');

		// The user id comes from the session, never from the request. Parsing also
		// drops properties that the event does not define.
		const parsed = event.properties.safeParse({ ...payload.properties, user_id: req.user.id });
		if (!parsed.success) throw new BadRequestError('The event properties are not valid');

		this.telemetry.track(event, parsed.data);
	}
}
