import type { RequestBodyMedia, RequestBodyMediaType } from '@n8n/decorators';

import { jsonRequestBody } from './json.request-body';
import { multipartRequestBody } from './multipart.request-body';
import type { RequestBodyHandler } from './types';

export type { RequestBodyHandler } from './types';

/**
 * One handler per request-body media type `@Body` can declare.
 */
export const REQUEST_BODY_HANDLERS: Record<RequestBodyMediaType, RequestBodyHandler> = {
	'application/json': jsonRequestBody,
	'multipart/form-data': multipartRequestBody,
};

/** The media type every route had before `@Body` could declare one - the default for a route that doesn't. */
export const JSON_REQUEST_BODY_MEDIA: RequestBodyMedia = { mediaType: 'application/json' };
