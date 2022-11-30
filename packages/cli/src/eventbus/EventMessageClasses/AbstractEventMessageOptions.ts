import { DateTime } from 'luxon';
import { EventMessageLevel } from 'n8n-workflow';
import { AbstractEventPayload } from './AbstractEventPayload';

export interface AbstractEventMessageOptions {
	__type?: string;

	id?: string;

	ts?: DateTime | string;

	eventName: string;

	message?: string;

	level?: EventMessageLevel | string;

	payload?: AbstractEventPayload;

	anoymize?: boolean;
}
