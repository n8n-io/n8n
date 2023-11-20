import type { Scope, HasScopeOptions } from '@n8n/permissions';
import type { ScopeMetadata } from './types';
import { CONTROLLER_REQUIRED_SCOPES } from './constants';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const RequireGlobalScope = (scope: Scope | Scope[], hasScopeOptions?: HasScopeOptions) => {
	// eslint-disable-next-line @typescript-eslint/ban-types
	return (target: Function | Object, handlerName?: string) => {
		const controllerClass = handlerName ? target.constructor : target;
		const scopes = (Reflect.getMetadata(CONTROLLER_REQUIRED_SCOPES, controllerClass) ??
			{}) as ScopeMetadata;
		scopes[handlerName ?? '*'] = {
			scopes: Array.isArray(scope) ? scope : [scope],
			options: hasScopeOptions,
		};
		Reflect.defineMetadata(CONTROLLER_REQUIRED_SCOPES, scopes, controllerClass);
	};
};
