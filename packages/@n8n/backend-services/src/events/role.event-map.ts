import type {} from './event.service';

declare module './event.service' {
	interface EventMap {
		'custom-role-updated': { userId: string; roleSlug: string; scopes: string[] };
		'custom-role-deleted': { userId: string; roleSlug: string };
	}
}
