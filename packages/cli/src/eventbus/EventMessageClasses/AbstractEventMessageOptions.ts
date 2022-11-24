import { DateTime } from 'luxon';
import { AbstractEventPayload } from './AbstractEventPayload';
import { EventMessageLevel } from './Enums';

export abstract class AbstractEventMessageOptions {
	__type?: string;

	id?: string;

	ts?: DateTime | string;

	eventName: string;

	message?: string;

	level?: EventMessageLevel;

	payload?: AbstractEventPayload;
}
