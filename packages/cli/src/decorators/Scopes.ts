import type { Scope, ScopeOptions } from '@n8n/permissions';
import type { ScopeMetadata } from './types';
import { CONTROLLER_REQUIRED_SCOPES } from './constants';

export const RequireGlobalScope = (scope: Scope | Scope[], scopeOptions?: ScopeOptions) => {
	// eslint-disable-next-line @typescript-eslint/ban-types
	return (target: Function | object, handlerName?: string) => {
		const controllerClass = handlerName ? target.constructor : target;
		const scopes = (Reflect.getMetadata(CONTROLLER_REQUIRED_SCOPES, controllerClass) ??
			{}) as ScopeMetadata;
		scopes[handlerName ?? '*'] = {
			scopes: Array.isArray(scope) ? scope : [scope],
			options: scopeOptions,
		};
		Reflect.defineMetadata(CONTROLLER_REQUIRED_SCOPES, scopes, controllerClass);
	};
};
