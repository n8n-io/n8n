import type { RequestBodyMedia, RequestBodyMediaType } from '@n8n/decorators';

import { jsonRequestBody } from './json.request-body';
import { multipartRequestBody } from './multipart.request-body';
import type { RequestBodyHandler } from './request-body-handler';

export type { RequestBodyHandler } from './request-body-handler';

/**
 * One handler per request-body media type `@Body` can declare. This `Record` requires every key of
 * `RequestBodyMediaType` to have an entry, so adding a media type to `RequestBodyMediaOptions` (in
 * `@n8n/decorators`) breaks the build until a handler for it is registered here - the only place a
 * new media type's runtime behaviour needs wiring in. See `../../../../../.agents/skills/public-api/reference.md`
 * for the full checklist.
 */
export const REQUEST_BODY_HANDLERS: Record<RequestBodyMediaType, RequestBodyHandler> = {
	'application/json': jsonRequestBody,
	'multipart/form-data': multipartRequestBody,
};

/** The media type every route had before `@Body` could declare one - the default for a route that doesn't. */
export const JSON_REQUEST_BODY_MEDIA: RequestBodyMedia = { mediaType: 'application/json' };

/** Looks up the handler for a route's request-body media type. */
export function requestBodyHandlerFor(media: RequestBodyMedia): RequestBodyHandler {
	return REQUEST_BODY_HANDLERS[media.mediaType];
}
