import { Service } from 'typedi';
import { generateSshKeyPair } from './versionControlHelper';
import { VersionControlPreferences } from './types/versionControlPreferences';
import { VERSION_CONTROL_PREFERENCES_DB_KEY } from './constants';
import * as Db from '@/Db';
import { jsonParse } from 'n8n-workflow';

@Service()
export class VersionControlService {
	private _versionControlPreferences: VersionControlPreferences = new VersionControlPreferences();

	async init(): Promise<void> {
		await this.loadFromDbAndApplyVersionControlPreferences();
	}

	public get versionControlPreferences(): VersionControlPreferences {
		return {
			...this._versionControlPreferences,
			privateKey: '',
		};
	}

	async generateAndSaveKeyPair(keyType: 'ed25519' | 'rsa' = 'ed25519') {
		const keyPair = generateSshKeyPair(keyType);
		if (keyPair.publicKey && keyPair.privateKey) {
			this.setPreferences({ ...keyPair });
			await this.saveSamlPreferencesToDb();
		}
		return keyPair;
	}

	setPreferences(prefs: Partial<VersionControlPreferences>) {
		this._versionControlPreferences = {
			...this._versionControlPreferences,
			...prefs,
		};
	}

	async loadFromDbAndApplyVersionControlPreferences(): Promise<
		VersionControlPreferences | undefined
	> {
		const loadedPrefs = await Db.collections.Settings.findOne({
			where: { key: VERSION_CONTROL_PREFERENCES_DB_KEY },
		});
		if (loadedPrefs) {
			try {
				const prefs = jsonParse<VersionControlPreferences>(loadedPrefs.value);
				if (prefs) {
					this.setPreferences(prefs);
					return prefs;
				}
			} catch {}
		}
		return;
	}

	async saveSamlPreferencesToDb(): Promise<VersionControlPreferences | undefined> {
		const settingsValue = JSON.stringify(this._versionControlPreferences);
		const result = await Db.collections.Settings.save({
			key: VERSION_CONTROL_PREFERENCES_DB_KEY,
			value: settingsValue,
			loadOnStartup: true,
		});
		if (result)
			try {
				return jsonParse<VersionControlPreferences>(result.value);
			} catch {}
		return;
	}
}
