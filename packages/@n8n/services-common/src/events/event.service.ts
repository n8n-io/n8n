import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

/**
 * Events that flow through `EventService`. This package declares the events
 * that its own services emit. `cli` and the backend modules add theirs with
 * `declare module '@n8n/services-common' { interface EventMap { ... } }`.
 */
export interface EventMap {
	'custom-role-created': { userId: string; roleSlug: string; scopes: string[] };
	'custom-role-updated': { userId: string; roleSlug: string; scopes: string[] };
	'custom-role-deleted': { userId: string; roleSlug: string };
}

@Service()
export class EventService extends TypedEmitter<EventMap> {}
