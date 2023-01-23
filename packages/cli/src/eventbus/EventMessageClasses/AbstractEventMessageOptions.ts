import type { DateTime } from 'luxon';
import { EventMessageTypeNames } from 'n8n-workflow';
import type { AbstractEventPayload } from './AbstractEventPayload';

export interface AbstractEventMessageOptions {
	__type?: EventMessageTypeNames;
	id?: string;
	ts?: DateTime | string;
	eventName: string;
	message?: string;
	payload?: AbstractEventPayload;
	anonymize?: boolean;
}
