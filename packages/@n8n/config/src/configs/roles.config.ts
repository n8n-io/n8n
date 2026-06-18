import { Config, Env } from '../decorators';

@Config
export class RolesConfig {
	/**
	 * Dark-launch flag for the custom instance roles UI. When off, the
	 * instance-roles surface is not exposed in the frontend.
	 */
	@Env('N8N_CUSTOM_INSTANCE_ROLES_ENABLED')
	customInstanceRolesEnabled: boolean = false;
}
