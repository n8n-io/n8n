/* eslint-disable no-underscore-dangle */
import path from 'path';
import keygen from 'ssh-keygen-lite';
import { promisify } from 'util';
import type { Settings } from '../databases/entities/Settings';

const keygenAsync = promisify(keygen);

import { constants as fsConstants } from 'fs';
import {
	access as fsAccess,
	mkdir as fsMkdir,
	readFile as fsReadFile,
	writeFile as fsWriteFile,
} from 'fs/promises';

import * as Db from '@/Db';
import { UserSettings } from 'n8n-core';

import type { SimpleGit, SimpleGitOptions } from 'simple-git';
import simpleGit from 'simple-git';
import {
	ENVIRONMENT_GIT_FOLDER,
	ENVIRONMENT_PREFERENCES_DB_KEY,
	ENVIRONMENT_SSH_FOLDER,
} from './constants';
import type { EnvironmentPreferences } from './types/environmentPreferences';
import { jsonParse } from 'n8n-workflow';

// TODOs:
// TODO: Check what happens when there is no change
// TODO: Make pull work
// TODO: Make it possible to enable with license

export class EnvironmentService {
	private _config: EnvironmentPreferences = {
		remoteRepository: '',
		email: '',
		name: '',
	};

	private gitFolder: string;

	private sshFolder: string;

	private git: SimpleGit;

	private initialized = false;

	set config(config: EnvironmentPreferences) {
		this._config = config;
	}

	public get config(): EnvironmentPreferences {
		return {
			...this._config,
		};
	}

	async init(): Promise<void> {
		const userFolder = UserSettings.getUserN8nFolderPath();

		this.gitFolder = path.join(userFolder, ENVIRONMENT_GIT_FOLDER);
		this.sshFolder = path.join(userFolder, ENVIRONMENT_SSH_FOLDER);

		// Make sure the folders exists
		[this.gitFolder, this.sshFolder].forEach(async (folder) => {
			try {
				await fsAccess(folder, fsConstants.F_OK);
			} catch (error) {
				await fsMkdir(folder);
			}
		});

		await this.loadFromDbAndApplyEnvironmentPreferences();

		if (!this.initialized && this.config.remoteRepository) {
			await this.initGit();
		}
	}

	async initGit(): Promise<void> {
		if (this.initialized) {
			return;
		}

		const gitOptions: Partial<SimpleGitOptions> = {
			baseDir: this.gitFolder,
		};

		const sshKnownHosts = path.join(this.sshFolder, 'known_hosts');
		const sshKey = path.join(this.sshFolder, 'rsa');

		const sshCommand = `ssh -o UserKnownHostsFile=${sshKnownHosts} -o StrictHostKeyChecking=no -i ${sshKey}`;

		this.git = simpleGit(gitOptions)
			// Tell git not to ask for any information via the terminal like for
			// example the username. As nobody will be able to answer it would
			// n8n keep on waiting forever.
			.env('GIT_SSH_COMMAND', sshCommand)
			.env('GIT_TERMINAL_PROMPT', '0');

		this.initialized = true;
	}

	async getSshPrivateKey(): Promise<string> {
		const privateFilePath = path.join(this.sshFolder, 'rsa');
		return (await fsReadFile(privateFilePath, 'utf8')).trim();
	}

	async getSshPublicKey(email: string): Promise<string> {
		// Check if key already exists
		// if not create, if yes return
		const pubFilePath = path.join(this.sshFolder, 'rsa.pub');

		try {
			await fsAccess(pubFilePath, fsConstants.F_OK);
		} catch (error) {
			// SSH key does not exist yet
			return this.createSshKey(email);
		}

		// SSH key does already exist
		return (await fsReadFile(pubFilePath, 'utf8')).trim();
	}

	async createSshKey(email: string): Promise<string> {
		console.log('createSshKey1');
		const out = (await keygenAsync({
			location: path.join(this.sshFolder, 'rsa'),
			comment: email,
			password: '',
			read: true,
			format: 'PEM',
		})) as { key: string; pubKey: string };

		return out.pubKey;
	}

	async checkRepositorySetup(): Promise<boolean> {
		try {
			await this.git.status();
			// Is already initialized
			return true;
		} catch (error) {
			return false;
		}
	}

	async initRepository(): Promise<void> {
		if (await this.checkRepositorySetup()) {
			throw new Error('Repository is already initialized');
		}

		// Is not initialized yet
		await this.git.clone(this.config.remoteRepository, this.gitFolder);

		await this.git.addConfig('user.email', this.config.email);
		await this.git.addConfig('user.name', this.config.name);
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		// Get remote branches
		const { branches } = await this.git.branch(['-r']);
		const remoteBranches = Object.keys(branches)
			.map((name) => name.split('/')[1])
			.filter((name) => name !== 'HEAD');

		const { current } = await this.git.branch();

		return {
			branches: remoteBranches,
			currentBranch: current,
		};
	}

	async exportWorkflows(destinationFolder: string): Promise<void> {
		const workflows = await Db.collections.Workflow.find();
		for (const workflow of workflows) {
			await fsWriteFile(
				path.join(destinationFolder, `${workflow.id}.json`),
				JSON.stringify(workflow, null, 2),
				{
					encoding: 'binary',
					flag: 'w',
				},
			);
		}
	}

	async push(message: string): Promise<void> {
		await this.exportWorkflows(this.gitFolder);

		// Always pull first to make sure there are no conflicts
		await this.git.fetch();

		await this.git.add(this.gitFolder);
		await this.git.commit(message, this.gitFolder);
		await this.git.push();
	}

	async loadFromDbAndApplyEnvironmentPreferences(): Promise<EnvironmentPreferences | undefined> {
		const environmentPreferences = await Db.collections.Settings.findOne({
			where: { key: ENVIRONMENT_PREFERENCES_DB_KEY },
		});
		if (environmentPreferences) {
			const prefs = jsonParse<EnvironmentPreferences>(environmentPreferences.value);
			if (prefs) {
				await this.setEnvironmentPreferences(prefs);
				return prefs;
			}
		}
		return;
	}

	async saveEnvironmentPreferencesToDb(): Promise<EnvironmentPreferences | undefined> {
		const samlPreferences = await Db.collections.Settings.findOne({
			where: { key: ENVIRONMENT_PREFERENCES_DB_KEY },
		});
		const settingsValue = JSON.stringify(this.config);
		let result: Settings;
		if (samlPreferences) {
			samlPreferences.value = settingsValue;
			result = await Db.collections.Settings.save(samlPreferences);
		} else {
			result = await Db.collections.Settings.save({
				key: ENVIRONMENT_PREFERENCES_DB_KEY,
				value: settingsValue,
				loadOnStartup: true,
			});
		}
		if (result) return jsonParse<EnvironmentPreferences>(result.value);
		return;
	}

	async setBranch(branch: string) {
		return this.git.checkout(branch);
	}

	async setEnvironmentPreferences(
		prefs: EnvironmentPreferences,
	): Promise<EnvironmentPreferences | undefined> {
		this._config.remoteRepository = prefs.remoteRepository ?? this._config.remoteRepository;
		this._config.email = prefs.email ?? this._config.email;
		this._config.name = prefs.name ?? this._config.name;

		return this.saveEnvironmentPreferencesToDb();
	}
}
