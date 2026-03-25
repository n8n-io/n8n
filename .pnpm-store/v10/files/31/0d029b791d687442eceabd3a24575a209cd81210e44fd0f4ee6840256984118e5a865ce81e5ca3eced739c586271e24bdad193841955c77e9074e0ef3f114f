import type { Auth } from '../types';
import type { Middleware } from './index';
/**
 * Automatically configure your requests with basic auth
 *
 * Example:
 * In your manifest:
 * {
 *   middleware: [ BasicAuthMiddleware({ username: 'bob', password: 'bob' }) ]
 * }
 *
 * Making the call:
 * client.User.all()
 * // => header: "Authorization: Basic Ym9iOmJvYg=="
 */
export declare const BasicAuthMiddleware: (authConfig: Auth) => Middleware;
export default BasicAuthMiddleware;
