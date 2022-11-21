import { JsonValue } from 'n8n-workflow';

export abstract class AbstractEventPayload {
	[key: string]: JsonValue;
}
