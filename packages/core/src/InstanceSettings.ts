import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { Service } from 'typedi';
import { jsonParse } from 'n8n-workflow';

interface ReadOnlySettings {
	encryptionKey: string;
	instanceId: string;
}

interface WritableSettings {
	tunnelSubdomain?: string;
}

type Settings = ReadOnlySettings & WritableSettings;

@Service()
export class InstanceSettings {
	readonly userHome = this.getUserHome();

	/** The path to the n8n folder in which all n8n related data gets saved */
	readonly n8nFolder = path.join(this.userHome, '.n8n');

	/** The path to the folder containing custom nodes and credentials */
	readonly customExtensionDir = path.join(this.n8nFolder, 'custom');

	/** The path to the folder containing installed nodes (like community nodes) */
	readonly nodesDownloadDir = path.join(this.n8nFolder, 'nodes');

	private readonly settingsFile = path.join(this.n8nFolder, 'config');

	private settings = this.loadOrCreate();

	get encryptionKey() {
		return this.settings.encryptionKey;
	}

	get instanceId() {
		return this.settings.instanceId;
	}

	get tunnelSubdomain() {
		return this.settings.tunnelSubdomain;
	}

	update(newSettings: WritableSettings) {
		this.save({ ...this.settings, ...newSettings });
	}

	/**
	 * The home folder path of the user.
	 * If none can be found it falls back to the current working directory
	 */
	private getUserHome() {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		return process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();
	}

	private loadOrCreate(): Settings {
		const { settingsFile } = this;
		if (existsSync(settingsFile)) {
			const content = readFileSync(settingsFile, 'utf8');
			return jsonParse(content, {
				errorMessage: `Error parsing n8n-config file "${settingsFile}". It does not seem to be valid JSON.`,
			});
		}

		// If file doesn't exist, create new settings
		const encryptionKey = process.env.N8N_ENCRYPTION_KEY ?? randomBytes(24).toString('base64');
		const instanceId = createHash('sha256')
			.update(encryptionKey.slice(Math.round(encryptionKey.length / 2)))
			.digest('hex');

		const settings = { encryptionKey, instanceId };
		mkdirSync(path.dirname(settingsFile));
		this.save(settings);
		console.log(`UserSettings were generated and saved to: ${settingsFile}`);
		return settings;
	}

	private save(settings: Settings) {
		this.settings = settings;
		writeFileSync(this.settingsFile, JSON.stringify(settings, null, '\t'), 'utf-8');
	}
}
