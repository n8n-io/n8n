import { Config, Env } from '@n8n/config';

@Config
export class InstanceSettingsConfig {
	/**
	 * Whether to enforce that n8n settings file doesn't have overly wide permissions.
	 * If set to true, n8n will check the permissions of the settings file and
	 * attempt change them to 0600 (only owner has rw access) if they are too wide.
	 */
	@Env('N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS')
	enforceSettingsFilePermissions: boolean = false;
}
