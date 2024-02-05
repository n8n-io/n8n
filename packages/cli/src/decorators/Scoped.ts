import type { Scope } from '@n8n/permissions';
import type { RouteScopeMetadata } from './types';
import { CONTROLLER_ROUTE_SCOPES } from './constants';

/**
 * Decorator for a controller method to ensure the user has a scope,
 * checking first at project level and then at global level.
 *
 * To check only at global level, use the `globalOnly` option.
 *
 * @example
 * ```ts
 * @RestController()
 * export class WorkflowController {
 *   @Get('/:id')
 *   @Scoped('workflow:read')
 *   async getWorkflow(req, res) { ... }
 * }
 * ```
 */
export const Scoped = (scope: Scope | Scope[], { globalOnly } = { globalOnly: false }) => {
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
