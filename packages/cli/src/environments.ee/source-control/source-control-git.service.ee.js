'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
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
exports.SourceControlGitService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const child_process_1 = require('child_process');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = __importDefault(require('path'));
const ownership_service_1 = require('@/services/ownership.service');
const constants_1 = require('./constants');
const source_control_helper_ee_1 = require('./source-control-helper.ee');
const source_control_preferences_service_ee_1 = require('./source-control-preferences.service.ee');
let SourceControlGitService = class SourceControlGitService {
	constructor(logger, ownershipService, sourceControlPreferencesService) {
		this.logger = logger;
		this.ownershipService = ownershipService;
		this.sourceControlPreferencesService = sourceControlPreferencesService;
		this.git = null;
		this.gitOptions = {};
	}
	preInitCheck() {
		this.logger.debug('GitService.preCheck');
		try {
			const gitResult = (0, child_process_1.execSync)('git --version', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			this.logger.debug(`Git binary found: ${gitResult.toString()}`);
		} catch (error) {
			this.logger.error('Git binary check failed', { error });
			throw new n8n_workflow_1.UnexpectedError('Git binary not found', { cause: error });
		}
		try {
			const sshResult = (0, child_process_1.execSync)('ssh -V', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			this.logger.debug(`SSH binary found: ${sshResult.toString()}`);
		} catch (error) {
			this.logger.error('SSH binary check failed', { error });
			throw new n8n_workflow_1.UnexpectedError('SSH binary not found', { cause: error });
		}
		return true;
	}
	async initService(options) {
		const { sourceControlPreferences: sourceControlPreferences, gitFolder, sshFolder } = options;
		this.logger.debug('GitService.init');
		if (this.git !== null) {
			return;
		}
		this.preInitCheck();
		this.logger.debug('Git pre-check passed');
		(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([gitFolder, sshFolder]);
		await this.setGitSshCommand(gitFolder, sshFolder);
		if (!(await this.checkRepositorySetup())) {
			await this.git.init();
		}
		if (!(await this.hasRemote(sourceControlPreferences.repositoryUrl))) {
			if (sourceControlPreferences.connected && sourceControlPreferences.repositoryUrl) {
				const instanceOwner = await this.ownershipService.getInstanceOwner();
				await this.initRepository(sourceControlPreferences, instanceOwner);
			}
		}
	}
	async setGitSshCommand(
		gitFolder = this.sourceControlPreferencesService.gitFolder,
		sshFolder = this.sourceControlPreferencesService.sshFolder,
	) {
		const privateKeyPath = await this.sourceControlPreferencesService.getPrivateKeyPath();
		const sshKnownHosts = path_1.default.join(sshFolder, 'known_hosts');
		const sshCommand = `ssh -o UserKnownHostsFile=${sshKnownHosts} -o StrictHostKeyChecking=no -i ${privateKeyPath}`;
		this.gitOptions = {
			baseDir: gitFolder,
			binary: 'git',
			maxConcurrentProcesses: 6,
			trimmed: false,
		};
		const { simpleGit } = await Promise.resolve().then(() => __importStar(require('simple-git')));
		this.git = simpleGit(this.gitOptions)
			.env('GIT_SSH_COMMAND', sshCommand)
			.env('GIT_TERMINAL_PROMPT', '0');
	}
	resetService() {
		this.git = null;
	}
	async checkRepositorySetup() {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (async)');
		}
		if (!(await this.git.checkIsRepo())) {
			return false;
		}
		try {
			await this.git.status();
			return true;
		} catch (error) {
			return false;
		}
	}
	async hasRemote(remote) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (async)');
		}
		try {
			const remotes = await this.git.getRemotes(true);
			const foundRemote = remotes.find(
				(e) => e.name === constants_1.SOURCE_CONTROL_ORIGIN && e.refs.push === remote,
			);
			if (foundRemote) {
				this.logger.debug(`Git remote found: ${foundRemote.name}: ${foundRemote.refs.push}`);
				return true;
			}
		} catch (error) {
			this.logger.error('Git remote check failed', { error });
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized', { cause: error });
		}
		this.logger.debug(`Git remote not found: ${remote}`);
		return false;
	}
	async initRepository(sourceControlPreferences, user) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (Promise)');
		}
		if (sourceControlPreferences.initRepo) {
			try {
				await this.git.init();
			} catch (error) {
				this.logger.debug(`Git init: ${error.message}`);
			}
		}
		try {
			await this.git.addRemote(
				constants_1.SOURCE_CONTROL_ORIGIN,
				sourceControlPreferences.repositoryUrl,
			);
			this.logger.debug(`Git remote added: ${sourceControlPreferences.repositoryUrl}`);
		} catch (error) {
			if (error.message.includes('remote origin already exists')) {
				this.logger.debug(`Git remote already exists: ${error.message}`);
			} else {
				throw error;
			}
		}
		await this.setGitUserDetails(
			user.firstName && user.lastName
				? `${user.firstName} ${user.lastName}`
				: constants_1.SOURCE_CONTROL_DEFAULT_NAME,
			user.email ?? constants_1.SOURCE_CONTROL_DEFAULT_EMAIL,
		);
		await this.trackRemoteIfReady(sourceControlPreferences.branchName);
		if (sourceControlPreferences.initRepo) {
			try {
				const branches = await this.getBranches();
				if (branches.branches?.length === 0) {
					await this.git.raw(['branch', '-M', sourceControlPreferences.branchName]);
				}
			} catch (error) {
				this.logger.debug(`Git init: ${error.message}`);
			}
		}
	}
	async trackRemoteIfReady(targetBranch) {
		if (!this.git) return;
		await this.fetch();
		const { currentBranch, branches: remoteBranches } = await this.getBranches();
		if (!currentBranch && remoteBranches.some((b) => b === targetBranch)) {
			await this.git.checkout(targetBranch);
			const upstream = [constants_1.SOURCE_CONTROL_ORIGIN, targetBranch].join('/');
			await this.git.branch([`--set-upstream-to=${upstream}`, targetBranch]);
			this.logger.info('Set local git repository to track remote', { upstream });
		}
	}
	async setGitUserDetails(name, email) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (setGitUserDetails)');
		}
		await this.git.addConfig('user.email', email);
		await this.git.addConfig('user.name', name);
	}
	async getBranches() {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (getBranches)');
		}
		try {
			const { branches } = await this.git.branch(['-r']);
			const remoteBranches = Object.keys(branches)
				.map((name) => name.split('/').slice(1).join('/'))
				.filter((name) => name !== 'HEAD');
			const { current } = await this.git.branch();
			return {
				branches: remoteBranches,
				currentBranch: current,
			};
		} catch (error) {
			this.logger.error('Failed to get branches', { error });
			throw new n8n_workflow_1.UnexpectedError('Could not get remote branches from repository', {
				cause: error,
			});
		}
	}
	async setBranch(branch) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (setBranch)');
		}
		await this.git.checkout(branch);
		await this.git.branch([
			`--set-upstream-to=${constants_1.SOURCE_CONTROL_ORIGIN}/${branch}`,
			branch,
		]);
		return await this.getBranches();
	}
	async getCurrentBranch() {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (getCurrentBranch)');
		}
		const currentBranch = (await this.git.branch()).current;
		return {
			current: currentBranch,
			remote: 'origin/' + currentBranch,
		};
	}
	async diffRemote() {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (diffRemote)');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.remote;
			return await this.git.diffSummary(['...' + target, '--ignore-all-space']);
		}
		return;
	}
	async diffLocal() {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (diffLocal)');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.current;
			return await this.git.diffSummary([target, '--ignore-all-space']);
		}
		return;
	}
	async fetch() {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (fetch)');
		}
		await this.setGitSshCommand();
		return await this.git.fetch();
	}
	async pull(options = { ffOnly: true }) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (pull)');
		}
		await this.setGitSshCommand();
		const params = {};
		if (options.ffOnly) {
			Object.assign(params, { '--ff-only': true });
		}
		return await this.git.pull(params);
	}
	async push(
		options = {
			force: false,
			branch: constants_1.SOURCE_CONTROL_DEFAULT_BRANCH,
		},
	) {
		const { force, branch } = options;
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized ({)');
		}
		await this.setGitSshCommand();
		if (force) {
			return await this.git.push(constants_1.SOURCE_CONTROL_ORIGIN, branch, ['-f']);
		}
		return await this.git.push(constants_1.SOURCE_CONTROL_ORIGIN, branch);
	}
	async stage(files, deletedFiles) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (stage)');
		}
		if (deletedFiles?.size) {
			try {
				await this.git.rm(Array.from(deletedFiles));
			} catch (error) {
				this.logger.debug(`Git rm: ${error.message}`);
			}
		}
		return await this.git.add(Array.from(files));
	}
	async resetBranch(options = { hard: true, target: 'HEAD' }) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (Promise)');
		}
		if (options?.hard) {
			return await this.git.raw(['reset', '--hard', options.target]);
		}
		return await this.git.raw(['reset', options.target]);
	}
	async commit(message) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (commit)');
		}
		return await this.git.commit(message);
	}
	async status() {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (status)');
		}
		const statusResult = await this.git.status();
		return statusResult;
	}
	async getFileContent(filePath, commit = 'HEAD') {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (getFileContent)');
		}
		try {
			const content = await this.git.show([`${commit}:${filePath}`]);
			return content;
		} catch (error) {
			this.logger.error('Failed to get file content', { filePath, error });
			throw new n8n_workflow_1.UnexpectedError(
				`Could not get content for file: ${filePath}: ${error?.message}`,
				{ cause: error },
			);
		}
	}
	async getCommitHistory(options = {}) {
		if (!this.git) {
			throw new n8n_workflow_1.UnexpectedError('Git is not initialized (getCommitHistory)');
		}
		try {
			const { limit = 10, offset = 0 } = options;
			const log = await this.git.log({
				maxCount: limit,
				from: offset > 0 ? `HEAD~${offset}` : undefined,
			});
			return log.all.map((commit) => ({
				hash: commit.hash,
				message: commit.message,
				author: commit.author_name,
				date: commit.date,
			}));
		} catch (error) {
			this.logger.error('Failed to get commit history', { error });
			throw new n8n_workflow_1.UnexpectedError(`Could not get commit history: ${error?.message}`, {
				cause: error,
			});
		}
	}
};
exports.SourceControlGitService = SourceControlGitService;
exports.SourceControlGitService = SourceControlGitService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			ownership_service_1.OwnershipService,
			source_control_preferences_service_ee_1.SourceControlPreferencesService,
		]),
	],
	SourceControlGitService,
);
//# sourceMappingURL=source-control-git.service.ee.js.map
