import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ApplicationError, jsonParse, ALPHABET } from 'n8n-workflow';
import { customAlphabet } from 'nanoid';
import path from 'path';
import { Service } from 'typedi';

const nanoid = customAlphabet(ALPHABET, 16);

interface ReadOnlySettings {
	encryptionKey: string;
}

interface WritableSettings {
	tunnelSubdomain?: string;
}

type Settings = ReadOnlySettings & WritableSettings;

type InstanceRole = 'unset' | 'leader' | 'follower';

export type InstanceType = 'main' | 'webhook' | 'worker';

const inTest = process.env.NODE_ENV === 'test';

@Service()
export class InstanceSettings {
	private readonly userHome = this.getUserHome();

	/** The path to the n8n folder in which all n8n related data gets saved */
	readonly n8nFolder = path.join(this.userHome, '.n8n');

	/** The path to the folder where all generated static assets are copied to */
	readonly staticCacheDir = path.join(this.userHome, '.cache/n8n/public');

	/** The path to the folder containing custom nodes and credentials */
	readonly customExtensionDir = path.join(this.n8nFolder, 'custom');

	/** The path to the folder containing installed nodes (like community nodes) */
	readonly nodesDownloadDir = path.join(this.n8nFolder, 'nodes');

	private readonly settingsFile = path.join(this.n8nFolder, 'config');

	private settings = this.loadOrCreate();

	/**
	 * Fixed ID of this n8n instance, for telemetry.
	 * Derived from encryption key. Do not confuse with `hostId`.
	 *
	 * @example '258fce876abf5ea60eb86a2e777e5e190ff8f3e36b5b37aafec6636c31d4d1f9'
	 */
	readonly instanceId = this.generateInstanceId();

	readonly instanceType: InstanceType;

	constructor() {
		const command = process.argv[2];
		this.instanceType = ['webhook', 'worker'].includes(command)
			? (command as InstanceType)
			: 'main';

		this.hostId = `${this.instanceType}-${nanoid()}`;
	}

	/**
	 * A main is:
	 * - `unset` during bootup,
	 * - `leader` after bootup in single-main setup,
	 * - `leader` or `follower` after bootup in multi-main setup.
	 *
	 * A non-main instance type (e.g. `worker`) is always `unset`.
	 */
	instanceRole: InstanceRole = 'unset';

	/**
	 * Transient ID of this n8n instance, for scaling mode.
	 * Reset on restart. Do not confuse with `instanceId`.
	 *
	 * @example 'main-bnxa1riryKUNHtln'
	 * @example 'worker-nDJR0FnSd2Vf6DB5'
	 * @example 'webhook-jxQ7AO8IzxEtfW1F'
	 */
	readonly hostId: string;

	get isLeader() {
		return this.instanceRole === 'leader';
	}

	markAsLeader() {
		this.instanceRole = 'leader';
	}

	get isFollower() {
		return this.instanceRole === 'follower';
	}

	markAsFollower() {
		this.instanceRole = 'follower';
	}

	get encryptionKey() {
		return this.settings.encryptionKey;
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

	/**
	 * Load instance settings from the settings file. If missing, create a new
	 * settings file with an auto-generated encryption key.
	 */
	private loadOrCreate(): Settings {
		if (existsSync(this.settingsFile)) {
			const content = readFileSync(this.settingsFile, 'utf8');

			const settings = jsonParse<Settings>(content, {
				errorMessage: `Error parsing n8n-config file "${this.settingsFile}". It does not seem to be valid JSON.`,
			});

			if (!inTest) console.info(`User settings loaded from: ${this.settingsFile}`);

			const { encryptionKey, tunnelSubdomain } = settings;

			if (process.env.N8N_ENCRYPTION_KEY && encryptionKey !== process.env.N8N_ENCRYPTION_KEY) {
				throw new ApplicationError(
					`Mismatching encryption keys. The encryption key in the settings file ${this.settingsFile} does not match the N8N_ENCRYPTION_KEY env var. Please make sure both keys match. More information: https://docs.n8n.io/hosting/environment-variables/configuration-methods/#encryption-key`,
				);
			}

			return { encryptionKey, tunnelSubdomain };
		}

		mkdirSync(this.n8nFolder, { recursive: true });

		const encryptionKey = process.env.N8N_ENCRYPTION_KEY ?? randomBytes(24).toString('base64');

		const settings: Settings = { encryptionKey };

		this.save(settings);

		if (!inTest && !process.env.N8N_ENCRYPTION_KEY) {
			console.info(`No encryption key found - Auto-generated and saved to: ${this.settingsFile}`);
		}

		return settings;
	}

	private generateInstanceId() {
		const { encryptionKey } = this;
		return createHash('sha256')
			.update(encryptionKey.slice(Math.round(encryptionKey.length / 2)))
			.digest('hex');
	}

	private save(settings: Settings) {
		this.settings = settings;
		writeFileSync(this.settingsFile, JSON.stringify(settings, null, '\t'), 'utf-8');
	}
}
