/* eslint-disable no-underscore-dangle */
import path from 'path';
import keygen from 'ssh-keygen-lite';
import { promisify } from 'util';
import glob from 'fast-glob';
import config from '@/config';

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
import { UserSettings, Credentials } from 'n8n-core';

import type { SimpleGit, SimpleGitOptions } from 'simple-git';
import simpleGit from 'simple-git';
import {
	ENVIRONMENT_GIT_FOLDER,
	ENVIRONMENT_PREFERENCES_DB_KEY,
	ENVIRONMENT_SSH_FOLDER,
} from './constants';
import type { EnvironmentPreferences } from './types/environmentPreferences';
import type { IWorkflowBase, ICredentialDataDecryptedObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { UM_FIX_INSTRUCTION } from '@/commands/BaseCommand';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@sentry/node';
import type { EntityManager } from 'typeorm';
import type { ICredentialsBase, ICredentialsDb } from '@/Interfaces';
import { providers } from 'gitops-secrets';

// TODOs:
// TODO: Check what happens when there is no change
// TODO: Make pull work
// TODO: Make it possible to enable with license
// TODO: Create proper folder structure (put workflows in subfolder)

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

	private transactionManager: EntityManager;

	set config(setConfig: EnvironmentPreferences) {
		this._config = setConfig;
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
		if (!(await this.checkRepositorySetup())) {
			return {
				branches: [],
				currentBranch: '',
			};
		}
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

	async exportWorkflows(): Promise<void> {
		const workflows = await Db.collections.Workflow.find();
		try {
			await fsAccess(path.join(this.gitFolder, '/workflows'), fsConstants.F_OK);
		} catch (error) {
			await fsMkdir(path.join(this.gitFolder, '/workflows'));
		}
		for (const workflow of workflows) {
			await fsWriteFile(
				path.join(this.gitFolder, '/workflows', `${workflow.id}.json`),
				JSON.stringify(workflow, null, 2),
				{
					encoding: 'binary',
					flag: 'w',
				},
			);
		}
	}

	async exportCredentials(): Promise<void> {
		const credentials = await Db.collections.Credentials.find();
		const encryptionKey = await UserSettings.getEncryptionKey();

		try {
			await fsAccess(path.join(this.gitFolder, '/credentials'), fsConstants.F_OK);
		} catch (error) {
			await fsMkdir(path.join(this.gitFolder, '/credentials'));
		}
		for (const credential of credentials) {
			const { name, type, nodesAccess, data, id } = credential;
			const credentialObject = new Credentials({ id, name }, type, nodesAccess, data);
			const plainData = credentialObject.getData(encryptionKey);
			(credential as ICredentialsDecryptedDb).data = this.replaceData(plainData);

			await fsWriteFile(
				path.join(this.gitFolder, '/credentials', `${credential.id}.json`),
				JSON.stringify(credential, null, 2),
				{
					encoding: 'binary',
					flag: 'w',
				},
			);
		}
	}

	async pull(): Promise<void> {
		await this.git.fetch();

		const workflowsFiles = await glob(path.join(this.gitFolder, '/workflows', '*.json'));
		const credentialFiles = await glob(path.join(this.gitFolder, '/credentials', '*.json'));

		const user = await this.getOwner();

		await Db.getConnection().transaction(async (transactionManager) => {
			this.transactionManager = transactionManager;
		});

		workflowsFiles.forEach(async (file) => {
			const workflow = await fsReadFile(file, 'utf8');
			await this.storeWorkflow(jsonParse<IWorkflowBase>(workflow), user);
		});

		let secrets;

		if (process.env.DOPPLER_TOKEN)
			secrets = await providers.doppler.fetch({ dopplerToken: process.env.DOPPLER_TOKEN });

		const encryptionKey = await UserSettings.getEncryptionKey();

		credentialFiles.forEach(async (file) => {
			const rawCredential = await fsReadFile(file, 'utf8');
			const { name, type, nodesAccess, data, id } = jsonParse<ICredentialsDb>(rawCredential);
			const credential = new Credentials({ id, name }, type, nodesAccess, data);

			if (secrets && secrets[`N8N_${id}`]) {
				credential.setData(jsonParse(secrets[`N8N_${id}`]), encryptionKey);
			} else {
				const existingCredential = await Db.collections.Credentials.findOneBy({ id });
				// Cred already exist and is not sync with Doppler, nothing to do
				if (existingCredential) return;
				// Cred doesn't exist and is not sync with Doppler, create with blank values
				if (data) {
					credential.setData(
						this.replaceCredentialData(data as ICredentialDataDecryptedObject),
						encryptionKey,
					);
				}
			}

			await this.storeCredential(credential.getDataToSave() as ICredentialsDb, user);
		});
	}

	async push(message: string): Promise<void> {
		await this.exportWorkflows();
		await this.exportCredentials();

		// Always pull first to make sure there are no conflicts
		// await this.git.fetch();
		await this.git.pull();

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

	private replaceCredentialData = (
		data: ICredentialDataDecryptedObject,
	): ICredentialDataDecryptedObject => {
		for (const [key] of Object.entries(data)) {
			data[key] = '';
		}
		return data;
	};

	// Followig code copied almost 1:1 from cli/src/commands/workflow.ts
	private async getOwner() {
		const ownerGlobalRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'global' },
		});

		const owner =
			ownerGlobalRole &&
			(await Db.collections.User.findOneBy({ globalRoleId: ownerGlobalRole?.id }));

		if (!owner) {
			throw new Error(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return owner;
	}

	private async storeWorkflow(workflow: IWorkflowBase, user: User) {
		const ownerWorkflowRole = await this.getOwnerWorkflowRole();

		const result = await this.transactionManager.upsert(WorkflowEntity, workflow, ['id']);
		await this.transactionManager.upsert(
			SharedWorkflow,
			{
				workflowId: result.identifiers[0].id as string,
				userId: user.id,
				roleId: ownerWorkflowRole.id,
			},
			['workflowId', 'userId'],
		);
		if (config.getEnv('database.type') === 'postgresdb') {
			await this.transactionManager.query(
				"SELECT setval('workflow_entity_id_seq', (SELECT MAX(id) from workflow_entity))",
			);
		}
	}

	private async storeCredential(credential: object, user: User) {
		const ownerCredentialRole = await this.getOwnerCredentialRole();

		const result = await this.transactionManager.upsert(CredentialsEntity, credential, ['id']);
		await this.transactionManager.upsert(
			SharedCredentials,
			{
				credentialsId: result.identifiers[0].id as string,
				userId: user.id,
				roleId: ownerCredentialRole.id,
			},
			['credentialsId', 'userId'],
		);
		if (config.getEnv('database.type') === 'postgresdb') {
			await this.transactionManager.query(
				"SELECT setval('credentials_entity_id_seq', (SELECT MAX(id) from credentials_entity))",
			);
		}
	}

	private async getOwnerCredentialRole() {
		const ownerCredentiallRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'global' },
		});

		if (!ownerCredentiallRole) {
			throw new Error(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return ownerCredentiallRole;
	}

	private async getOwnerWorkflowRole() {
		const ownerWorkflowRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'workflow' },
		});

		if (!ownerWorkflowRole) {
			throw new Error(`Failed to find owner workflow role. ${UM_FIX_INSTRUCTION}`);
		}

		return ownerWorkflowRole;
	}
}
