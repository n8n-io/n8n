import path from 'node:path';

import { Config, Env } from '../decorators';

@Config
export class InstanceSettingsConfig {
	/**
	 * Whether to enforce that n8n settings file doesn't have overly wide permissions.
	 * If set to true, n8n will check the permissions of the settings file and
	 * attempt change them to 0600 (only owner has rw access) if they are too wide.
	 */
	@Env('N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS')
	enforceSettingsFilePermissions: boolean = false;

	/**
	 * The home folder path of the user.
	 * If none can be found it falls back to the current working directory
	 */
	readonly userHome: string;

	readonly n8nFolder: string;

	constructor() {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		this.userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();

		this.n8nFolder = path.join(this.userHome, '.n8n');
	}
}
