/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/naming-convention */
import { CONTROLLER_AUTH_ROLES } from './constants';
import type { AuthRoleMetadata } from './types';

export function Authorized(authRole: AuthRoleMetadata[string] = 'any'): Function {
	return function (target: Function | Object, handlerName?: string) {
		const controllerClass = handlerName ? target.constructor : target;
		const authRoles = (Reflect.getMetadata(CONTROLLER_AUTH_ROLES, controllerClass) ??
			{}) as AuthRoleMetadata;
		authRoles[handlerName ?? '*'] = authRole;
		Reflect.defineMetadata(CONTROLLER_AUTH_ROLES, authRoles, controllerClass);
	};
}

export const NoAuthRequired = () => Authorized('none');
