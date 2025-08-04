'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SourceControlPreferencesService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const class_validator_1 = require('class-validator');
const promises_1 = require('fs/promises');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const promises_2 = require('node:fs/promises');
const path_1 = __importDefault(require('path'));
const constants_1 = require('./constants');
const source_control_helper_ee_1 = require('./source-control-helper.ee');
const source_control_config_1 = require('./source-control.config');
const source_control_preferences_1 = require('./types/source-control-preferences');
let SourceControlPreferencesService = class SourceControlPreferencesService {
	constructor(instanceSettings, logger, cipher, settingsRepository, sourceControlConfig) {
		this.instanceSettings = instanceSettings;
		this.logger = logger;
		this.cipher = cipher;
		this.settingsRepository = settingsRepository;
		this.sourceControlConfig = sourceControlConfig;
		this._sourceControlPreferences = new source_control_preferences_1.SourceControlPreferences();
		this.sshFolder = path_1.default.join(
			instanceSettings.n8nFolder,
			constants_1.SOURCE_CONTROL_SSH_FOLDER,
		);
		this.gitFolder = path_1.default.join(
			instanceSettings.n8nFolder,
			constants_1.SOURCE_CONTROL_GIT_FOLDER,
		);
		this.sshKeyName = path_1.default.join(this.sshFolder, constants_1.SOURCE_CONTROL_SSH_KEY_NAME);
	}
	get sourceControlPreferences() {
		return {
			...this._sourceControlPreferences,
			connected: this._sourceControlPreferences.connected ?? false,
		};
	}
	set sourceControlPreferences(preferences) {
		this._sourceControlPreferences = source_control_preferences_1.SourceControlPreferences.merge(
			preferences,
			this._sourceControlPreferences,
		);
	}
	isSourceControlSetup() {
		return (
			this.isSourceControlLicensedAndEnabled() &&
			this.getPreferences().repositoryUrl &&
			this.getPreferences().branchName
		);
	}
	async getKeyPairFromDatabase() {
		const dbSetting = await this.settingsRepository.findByKey('features.sourceControl.sshKeys');
		if (!dbSetting?.value) return null;
		return (0, n8n_workflow_1.jsonParse)(dbSetting.value, { fallbackValue: null });
	}
	async getPrivateKeyFromDatabase() {
		const dbKeyPair = await this.getKeyPairFromDatabase();
		if (!dbKeyPair) throw new n8n_workflow_1.UnexpectedError('Failed to find key pair in database');
		return this.cipher.decrypt(dbKeyPair.encryptedPrivateKey);
	}
	async getPublicKeyFromDatabase() {
		const dbKeyPair = await this.getKeyPairFromDatabase();
		if (!dbKeyPair) throw new n8n_workflow_1.UnexpectedError('Failed to find key pair in database');
		return dbKeyPair.publicKey;
	}
	async getPrivateKeyPath() {
		const dbPrivateKey = await this.getPrivateKeyFromDatabase();
		const tempFilePath = path_1.default.join(
			this.instanceSettings.n8nFolder,
			'ssh_private_key_temp',
		);
		await (0, promises_2.writeFile)(tempFilePath, dbPrivateKey);
		await (0, promises_2.chmod)(tempFilePath, 0o600);
		return tempFilePath;
	}
	async getPublicKey() {
		try {
			const dbPublicKey = await this.getPublicKeyFromDatabase();
			if (dbPublicKey) return dbPublicKey;
			return await (0, promises_2.readFile)(this.sshKeyName + '.pub', { encoding: 'utf8' });
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			this.logger.error(`Failed to read SSH public key: ${error.message}`);
		}
		return '';
	}
	async deleteKeyPair() {
		try {
			await (0, promises_1.rm)(this.sshFolder, { recursive: true });
			await this.settingsRepository.delete({ key: 'features.sourceControl.sshKeys' });
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			this.logger.error(`Failed to delete SSH key pair: ${error.message}`);
		}
	}
	async generateAndSaveKeyPair(keyPairType) {
		if (!keyPairType) {
			keyPairType =
				this.getPreferences().keyGeneratorType ?? this.sourceControlConfig.defaultKeyPairType;
		}
		const keyPair = await (0, source_control_helper_ee_1.generateSshKeyPair)(keyPairType);
		try {
			await this.settingsRepository.save({
				key: 'features.sourceControl.sshKeys',
				value: JSON.stringify({
					encryptedPrivateKey: this.cipher.encrypt(keyPair.privateKey),
					publicKey: keyPair.publicKey,
				}),
				loadOnStartup: true,
			});
		} catch (error) {
			throw new n8n_workflow_1.UnexpectedError('Failed to write key pair to database', {
				cause: error,
			});
		}
		if (keyPairType !== this.getPreferences().keyGeneratorType) {
			await this.setPreferences({ keyGeneratorType: keyPairType });
		}
		return this.getPreferences();
	}
	isBranchReadOnly() {
		return this._sourceControlPreferences.branchReadOnly;
	}
	isSourceControlConnected() {
		return this.sourceControlPreferences.connected;
	}
	isSourceControlLicensedAndEnabled() {
		return (
			this.isSourceControlConnected() && (0, source_control_helper_ee_1.isSourceControlLicensed)()
		);
	}
	getBranchName() {
		return this.sourceControlPreferences.branchName;
	}
	getPreferences() {
		return this.sourceControlPreferences;
	}
	async validateSourceControlPreferences(preferences, allowMissingProperties = true) {
		const preferencesObject = new source_control_preferences_1.SourceControlPreferences(
			preferences,
		);
		const validationResult = await (0, class_validator_1.validate)(preferencesObject, {
			forbidUnknownValues: false,
			skipMissingProperties: allowMissingProperties,
			stopAtFirstError: false,
			validationError: { target: false },
		});
		if (validationResult.length > 0) {
			throw new n8n_workflow_1.UnexpectedError('Invalid source control preferences', {
				extra: { preferences: validationResult },
			});
		}
		return validationResult;
	}
	async setPreferences(preferences, saveToDb = true) {
		const noKeyPair = (await this.getKeyPairFromDatabase()) === null;
		if (noKeyPair) await this.generateAndSaveKeyPair();
		this.sourceControlPreferences = preferences;
		if (saveToDb) {
			const settingsValue = JSON.stringify(this._sourceControlPreferences);
			try {
				await this.settingsRepository.save(
					{
						key: constants_1.SOURCE_CONTROL_PREFERENCES_DB_KEY,
						value: settingsValue,
						loadOnStartup: true,
					},
					{ transaction: false },
				);
			} catch (error) {
				throw new n8n_workflow_1.UnexpectedError('Failed to save source control preferences', {
					cause: error,
				});
			}
		}
		return this.sourceControlPreferences;
	}
	async loadFromDbAndApplySourceControlPreferences() {
		const loadedPreferences = await this.settingsRepository.findOne({
			where: { key: constants_1.SOURCE_CONTROL_PREFERENCES_DB_KEY },
		});
		if (loadedPreferences) {
			try {
				const preferences = (0, n8n_workflow_1.jsonParse)(loadedPreferences.value);
				if (preferences) {
					await this.setPreferences(preferences, false);
					return preferences;
				}
			} catch (error) {
				this.logger.warn(`Could not parse Source Control settings from database: ${error.message}`);
			}
		}
		await this.setPreferences(new source_control_preferences_1.SourceControlPreferences(), true);
		return this.sourceControlPreferences;
	}
};
exports.SourceControlPreferencesService = SourceControlPreferencesService;
exports.SourceControlPreferencesService = SourceControlPreferencesService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			n8n_core_1.InstanceSettings,
			backend_common_1.Logger,
			n8n_core_1.Cipher,
			db_1.SettingsRepository,
			source_control_config_1.SourceControlConfig,
		]),
	],
	SourceControlPreferencesService,
);
//# sourceMappingURL=source-control-preferences.service.ee.js.map
