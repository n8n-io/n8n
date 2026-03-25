import type { Context } from '../../context';
import type { AcceptHeader } from '../../utils/headers';
export interface Accept {
    type: string;
    params: Record<string, string>;
    q: number;
}
export interface acceptsConfig {
    header: AcceptHeader;
    supports: string[];
    default: string;
}
export interface acceptsOptions extends acceptsConfig {
    match?: (accepts: Accept[], config: acceptsConfig) => string;
}
export declare const defaultMatch: (accepts: Accept[], config: acceptsConfig) => string;
/**
 * Match the accept header with the given options.
 * @example
 * ```ts
 * app.get('/users', (c) => {
 *   const lang = accepts(c, {
 *     header: 'Accept-Language',
 *     supports: ['en', 'zh'],
 *     default: 'en',
 *   })
 * })
 * ```
 */
export declare const accepts: (c: Context, options: acceptsOptions) => string;
