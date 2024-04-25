import type { Scope } from '@n8n/permissions';
import type { ScopeMetadata } from './types';
import { CONTROLLER_REQUIRED_SCOPES } from './constants';

export const GlobalScope = (scope: Scope | Scope[]) => {
	// eslint-disable-next-line @typescript-eslint/ban-types
	return (target: Function | object, handlerName?: string) => {
		const controllerClass = handlerName ? target.constructor : target;
		const scopes = (Reflect.getMetadata(CONTROLLER_REQUIRED_SCOPES, controllerClass) ??
			[]) as ScopeMetadata;
		scopes[handlerName ?? '*'] = Array.isArray(scope) ? scope : [scope];
		Reflect.defineMetadata(CONTROLLER_REQUIRED_SCOPES, scopes, controllerClass);
	};
};
