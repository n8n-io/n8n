import type { Method } from 'axios';
import type { z } from 'zod';

import type { IRestApiContext } from './types';
import { makeRestApiRequest } from './utils';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Structural shape of a Zod-class DTO from `@n8n/api-types` (it exposes a static
 * `schema`). The request type is derived from `z.input`, NOT `z.infer`/`z.output`:
 * query/body DTOs may use `.transform()`/coercion, so the type the client must
 * SEND is the schema's INPUT, while `z.infer` would give the post-parse OUTPUT.
 */
export type AnyDto = { schema: z.ZodTypeAny };
type RequestOf<D> = D extends { schema: infer S }
	? S extends z.ZodType
		? z.input<S>
		: never
	: never;

/** Extract `:param` names from a path literal into `{ param: string }`. */
export type PathParams<P extends string> = P extends `${infer _Start}:${infer Param}/${infer Rest}`
	? { [K in Param]: string } & PathParams<`/${Rest}`>
	: P extends `${infer _Start}:${infer Param}`
		? { [K in Param]: string }
		: {};

export interface RouteContract {
	method: HttpMethod;
	path: string;
	body?: AnyDto;
	query?: AnyDto;
	/** Phantom carrier for the response type. */
	response?: unknown;
	/** Optional runtime response schema — when present the client validates the payload. */
	responseSchema?: z.ZodType;
}

/** Preserve literal `path` + DTO value types (needs a `const` type parameter). */
export function defineContract<const C extends Record<string, RouteContract>>(contract: C): C {
	return contract;
}

/** Phantom value that only carries a type. */
export const responseType = <T>(): T => undefined as unknown as T;

type ResponseOf<R extends RouteContract> = R extends { responseSchema: z.ZodType<infer T> }
	? T
	: R['response'];

type HasKeys<T> = keyof T extends never ? false : true;

type PathArg<P extends string> = HasKeys<PathParams<P>> extends true
	? { params: PathParams<P> }
	: {};
type QueryArg<R extends RouteContract> = R extends { query: AnyDto }
	? { query: RequestOf<R['query']> }
	: {};
type BodyArg<R extends RouteContract> = R extends { body: AnyDto }
	? { body: RequestOf<R['body']> }
	: {};

type ClientArg<R extends RouteContract> = PathArg<R['path']> & QueryArg<R> & BodyArg<R>;

type ClientFn<R extends RouteContract> = HasKeys<ClientArg<R>> extends true
	? (arg: ClientArg<R>) => Promise<ResponseOf<R>>
	: () => Promise<ResponseOf<R>>;

export type TypedClient<C extends Record<string, RouteContract>> = {
	[K in keyof C]: ClientFn<C[K]>;
};

function resolvePath(path: string, params: Record<string, string> | undefined): string {
	if (!params) return path;
	return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => encodeURIComponent(params[key]));
}

interface ClientCallArg {
	params?: Record<string, string>;
	query?: Record<string, unknown>;
	body?: Record<string, unknown>;
}

/**
 * Binds { method, path, request DTO(s), response type } into one call site so
 * changing a shared Zod DTO in `@n8n/api-types` breaks the call at compile time
 * instead of silently drifting. See API-42.
 */
export function createTypedClient<C extends Record<string, RouteContract>>(
	context: IRestApiContext,
	contract: C,
): TypedClient<C> {
	const client: Record<string, (arg?: ClientCallArg) => Promise<unknown>> = {};

	for (const key of Object.keys(contract)) {
		const route = contract[key];
		client[key] = async (arg?: ClientCallArg) => {
			const endpoint = resolvePath(route.path, arg?.params);
			// Single `data` arg folds into query params for GET, body otherwise —
			// matching the existing `makeRestApiRequest` convention.
			const data = route.method === 'GET' ? arg?.query : arg?.body;
			const raw = await makeRestApiRequest(context, route.method as Method, endpoint, data);
			return route.responseSchema ? route.responseSchema.parse(raw) : raw;
		};
	}

	return client as TypedClient<C>;
}
