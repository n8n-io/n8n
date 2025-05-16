import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

const Scoped =
	(scope: Scope, { globalOnly } = { globalOnly: false }): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.accessScope = { scope, globalOnly };
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
export const GlobalScope = (scope: Scope) => Scoped(scope, { globalOnly: true });

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

export const ProjectScope = (scope: Scope) => Scoped(scope);
