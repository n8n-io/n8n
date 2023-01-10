import type { DateTime } from 'luxon';
import { EventMessageTypeNames } from 'n8n-workflow';
// eslint-disable-next-line import/no-cycle
import { EventNamesTypes } from '.';
import type { AbstractEventPayload } from './AbstractEventPayload';

export interface AbstractEventMessageOptions {
	__type?: EventMessageTypeNames;
	id?: string;
	ts?: DateTime | string;
	eventName: EventNamesTypes;
	message?: string;
	payload?: AbstractEventPayload;
	anonymize?: boolean;
}
