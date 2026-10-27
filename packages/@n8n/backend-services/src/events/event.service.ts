import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

/** Each event owner adds its payload types through module augmentation. */
export interface EventMap {}

@Service()
export class EventService extends TypedEmitter<EventMap> {}
