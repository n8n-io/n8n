import type { DateTime } from 'luxon';
import type { AbstractEventPayload } from './AbstractEventPayload';

export interface AbstractEventMessageOptions {
	__type?: string;
	id?: string;
	ts?: DateTime | string;
	eventName: string;
	message?: string;
	payload?: AbstractEventPayload;
	anonymize?: boolean;
}
