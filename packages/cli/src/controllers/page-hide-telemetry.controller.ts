import { TrackPageHideEventRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { findPageHideEvent, TELEMETRY_EVENT, type PageHideEvent } from '@n8n/telemetry';
import type { Response } from 'express';

import { Telemetry } from '@/telemetry';

/**
 * The scope a user needs to emit each event, so a user cannot send an event for
 * a feature that they cannot use. The type makes you add a scope when you add an
 * event to `PAGE_HIDE_EVENTS`.
 */
const REQUIRED_SCOPE: Record<PageHideEvent['name'], Scope> = {
	[TELEMETRY_EVENT.INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN.name]:
		'instanceAi:message',
};

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
		if (!hasGlobalScope(req.user, REQUIRED_SCOPE[event.name])) {
			throw new ForbiddenError('You cannot send this event');
		}

		// The user id comes from the session, never from the request. Parsing also
		// drops properties that the event does not define.
		const parsed = event.properties.safeParse({ ...payload.properties, user_id: req.user.id });
		if (!parsed.success) throw new BadRequestError('The event properties are not valid');

		this.telemetry.track(event, parsed.data);
	}
}
