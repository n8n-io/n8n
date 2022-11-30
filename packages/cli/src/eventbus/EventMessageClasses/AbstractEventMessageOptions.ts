import { DateTime } from 'luxon';
import { AbstractEventPayload } from './AbstractEventPayload';

export interface AbstractEventMessageOptions {
	__type?: string;

	id?: string;

	ts?: DateTime | string;

	eventName: string;

	message?: string;

	payload?: AbstractEventPayload;

	anoymize?: boolean;
}
