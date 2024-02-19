import type { Scope } from '@n8n/permissions';
import type { RouteScopeMetadata } from './types';
import { CONTROLLER_ROUTE_SCOPES } from './constants';

const Scoped = (scope: Scope | Scope[], { globalOnly } = { globalOnly: false }) => {
	return (target: Function | object, handlerName?: string) => {
		const controllerClass = handlerName ? target.constructor : target;
		const scopes = (Reflect.getMetadata(CONTROLLER_ROUTE_SCOPES, controllerClass) ??
			{}) as RouteScopeMetadata;

		const metadata = {
			scopes: Array.isArray(scope) ? scope : [scope],
			globalOnly,
		};

		scopes[handlerName ?? '*'] = metadata;
		Reflect.defineMetadata(CONTROLLER_ROUTE_SCOPES, scopes, controllerClass);
	};
};

/**
 * Decorator for a controller method to ensure the user has a scope,
 * checking only at the global level.
 *
 * To check only at project level as well, use the `@ProjectScope` decorator.
 *
 * @example
 * ```ts
 * @RestController()
 * export class UsersController {
 *   @Delete('/:id')
 *   @GlobalScope('user:delete')
 *   async deleteUser(req, res) { ... }
 * }
 * ```
 */
export const GlobalScope = (scope: Scope | Scope[]) => {
	return Scoped(scope, { globalOnly: true });
};

/**
 * Decorator for a controller method to ensure the user has a scope,
 * checking first at project level and then at global level.
 *
 * To check only at global level, use the `@GlobalScope` decorator.
 *
 * @example
 * ```ts
 * @RestController()
 * export class WorkflowController {
 *   @Get('/:workflowId')
 *   @GlobalScope('workflow:read')
 *   async getWorkflow(req, res) { ... }
 * }
 * ```
 */

export const ProjectScope = (scope: Scope | Scope[]) => {
	return Scoped(scope);
};
