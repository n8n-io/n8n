import { HonoBase } from './hono-base';
import type { HonoOptions } from './hono-base';
import type { BlankEnv, BlankSchema, Env, Schema } from './types';
/**
 * The Hono class extends the functionality of the HonoBase class.
 * It sets up routing and allows for custom options to be passed.
 *
 * @template E - The environment type.
 * @template S - The schema type.
 * @template BasePath - The base path type.
 */
export declare class Hono<E extends Env = BlankEnv, S extends Schema = BlankSchema, BasePath extends string = '/'> extends HonoBase<E, S, BasePath> {
    /**
     * Creates an instance of the Hono class.
     *
     * @param options - Optional configuration options for the Hono instance.
     */
    constructor(options?: HonoOptions<E>);
}
