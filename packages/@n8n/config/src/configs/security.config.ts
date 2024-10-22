import { Config, Env } from '../decorators';

@Config
export class SecurityConfig {
	/** Whether to enforce that n8n settings file doesn't have overly wide permissions */
	@Env('N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS')
	enforceSettingsFilePermissions: boolean = false;
}
