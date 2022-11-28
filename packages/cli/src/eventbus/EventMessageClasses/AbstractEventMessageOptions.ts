import { DateTime } from 'luxon';
import { EventMessageLevel } from 'n8n-workflow';
import { AbstractEventPayload } from './AbstractEventPayload';

export abstract class AbstractEventMessageOptions {
	__type?: string;

	id?: string;

	ts?: DateTime | string;

	eventName: string;

	message?: string;

	level?: EventMessageLevel;

	payload?: AbstractEventPayload;
}
