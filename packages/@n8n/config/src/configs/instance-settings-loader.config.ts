import { Config, Env } from '../decorators';

@Config
export class InstanceSettingsLoaderConfig {
	/** When true, update the instance owner with the provided values on every startup. */
	@Env('INSTANCE_OWNER_OVERRIDE')
	ownerOverride: boolean = false;

	@Env('INSTANCE_OWNER_EMAIL')
	ownerEmail: string = '';

	@Env('INSTANCE_OWNER_FIRST_NAME')
	ownerFirstName: string = '';

	@Env('INSTANCE_OWNER_LAST_NAME')
	ownerLastName: string = '';

	/**
	 * Pre-hashed bcrypt password for the instance owner.
	 * Use when the hash is provided by an external secrets system or deployment pipeline.
	 * WARNING: providing a plaintext password here will result in a broken login.
	 */
	@Env('INSTANCE_OWNER_PASSWORD_HASH')
	ownerPasswordHash: string = '';
}
