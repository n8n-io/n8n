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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ImportCredentialsCommand = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const fast_glob_1 = __importDefault(require('fast-glob'));
const fs_1 = __importDefault(require('fs'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const zod_1 = require('zod');
const constants_1 = require('@/constants');
const base_command_1 = require('../base-command');
const flagsSchema = zod_1.z.object({
	input: zod_1.z
		.string()
		.alias('i')
		.describe('Input file name or directory if --separate is used')
		.optional(),
	separate: zod_1.z
		.boolean()
		.default(false)
		.describe('Imports *.json files from directory provided by --input'),
	userId: zod_1.z
		.string()
		.describe('The ID of the user to assign the imported credentials to')
		.optional(),
	projectId: zod_1.z
		.string()
		.describe('The ID of the project to assign the imported credential to')
		.optional(),
});
let ImportCredentialsCommand = class ImportCredentialsCommand extends base_command_1.BaseCommand {
	async run() {
		const { flags } = this;
		if (!flags.input) {
			this.logger.info('An input file or directory with --input must be provided');
			return;
		}
		if (flags.separate) {
			if (fs_1.default.existsSync(flags.input)) {
				if (!fs_1.default.lstatSync(flags.input).isDirectory()) {
					this.logger.info('The argument to --input must be a directory');
					return;
				}
			}
		}
		if (flags.projectId && flags.userId) {
			throw new n8n_workflow_1.UserError(
				'You cannot use `--userId` and `--projectId` together. Use one or the other.',
			);
		}
		const credentials = await this.readCredentials(flags.input, flags.separate);
		const { manager: dbManager } = di_1.Container.get(db_1.ProjectRepository);
		await dbManager.transaction(async (transactionManager) => {
			this.transactionManager = transactionManager;
			const project = await this.getProject(flags.userId, flags.projectId);
			const result = await this.checkRelations(credentials, flags.projectId, flags.userId);
			if (!result.success) {
				throw new n8n_workflow_1.UserError(result.message);
			}
			for (const credential of credentials) {
				await this.storeCredential(credential, project);
			}
		});
		this.reportSuccess(credentials.length);
	}
	async catch(error) {
		this.logger.error(
			'An error occurred while importing credentials. See log messages for details.',
		);
		this.logger.error(error.message);
	}
	reportSuccess(total) {
		this.logger.info(
			`Successfully imported ${total} ${total === 1 ? 'credential.' : 'credentials.'}`,
		);
	}
	async storeCredential(credential, project) {
		const result = await this.transactionManager.upsert(db_1.CredentialsEntity, credential, ['id']);
		const sharingExists = await this.transactionManager.existsBy(db_1.SharedCredentials, {
			credentialsId: credential.id,
			role: 'credential:owner',
		});
		if (!sharingExists) {
			await this.transactionManager.upsert(
				db_1.SharedCredentials,
				{
					credentialsId: result.identifiers[0].id,
					role: 'credential:owner',
					projectId: project.id,
				},
				['credentialsId', 'projectId'],
			);
		}
	}
	async checkRelations(credentials, projectId, userId) {
		if (!projectId && !userId) {
			return {
				success: true,
				message: undefined,
			};
		}
		for (const credential of credentials) {
			if (credential.id === undefined) {
				continue;
			}
			if (!(await this.credentialExists(credential.id))) {
				continue;
			}
			const { user, project: ownerProject } = await this.getCredentialOwner(credential.id);
			if (!ownerProject) {
				continue;
			}
			if (ownerProject.id !== projectId) {
				const currentOwner =
					ownerProject.type === 'personal'
						? `the user with the ID "${user.id}"`
						: `the project with the ID "${ownerProject.id}"`;
				const newOwner = userId
					? `the user with the ID "${userId}"`
					: `the project with the ID "${projectId}"`;
				return {
					success: false,
					message: `The credential with ID "${credential.id}" is already owned by ${currentOwner}. It can't be re-owned by ${newOwner}.`,
				};
			}
		}
		return {
			success: true,
			message: undefined,
		};
	}
	async readCredentials(path, separate) {
		const cipher = di_1.Container.get(n8n_core_1.Cipher);
		if (process.platform === 'win32') {
			path = path.replace(/\\/g, '/');
		}
		let credentials;
		if (separate) {
			const files = await (0, fast_glob_1.default)('*.json', {
				cwd: path,
				absolute: true,
			});
			credentials = files.map((file) =>
				(0, n8n_workflow_1.jsonParse)(fs_1.default.readFileSync(file, { encoding: 'utf8' })),
			);
		} else {
			const credentialsUnchecked = (0, n8n_workflow_1.jsonParse)(
				fs_1.default.readFileSync(path, { encoding: 'utf8' }),
			);
			if (!Array.isArray(credentialsUnchecked)) {
				throw new n8n_workflow_1.UserError(
					'File does not seem to contain credentials. Make sure the credentials are contained in an array.',
				);
			}
			credentials = credentialsUnchecked;
		}
		return credentials.map((credential) => {
			if (typeof credential.data === 'object') {
				credential.data = cipher.encrypt(credential.data);
			}
			return credential;
		});
	}
	async getCredentialOwner(credentialsId) {
		const sharedCredential = await this.transactionManager.findOne(db_1.SharedCredentials, {
			where: { credentialsId, role: 'credential:owner' },
			relations: { project: true },
		});
		if (sharedCredential && sharedCredential.project.type === 'personal') {
			const user = await this.transactionManager.findOneByOrFail(db_1.User, {
				projectRelations: {
					role: 'project:personalOwner',
					projectId: sharedCredential.projectId,
				},
			});
			return { user, project: sharedCredential.project };
		}
		return {};
	}
	async credentialExists(credentialId) {
		return await this.transactionManager.existsBy(db_1.CredentialsEntity, { id: credentialId });
	}
	async getProject(userId, projectId) {
		if (projectId) {
			return await this.transactionManager.findOneByOrFail(db_1.Project, { id: projectId });
		}
		if (!userId) {
			const owner = await this.transactionManager.findOneBy(db_1.User, { role: 'global:owner' });
			if (!owner) {
				throw new n8n_workflow_1.UserError(
					`Failed to find owner. ${constants_1.UM_FIX_INSTRUCTION}`,
				);
			}
			userId = owner.id;
		}
		return await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
			userId,
			this.transactionManager,
		);
	}
};
exports.ImportCredentialsCommand = ImportCredentialsCommand;
exports.ImportCredentialsCommand = ImportCredentialsCommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'import:credentials',
			description: 'Import credentials',
			examples: [
				'--input=file.json',
				'--separate --input=backups/latest/',
				'--input=file.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
				'--input=file.json --projectId=Ox8O54VQrmBrb4qL',
				'--separate --input=backups/latest/ --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
			],
			flagsSchema,
		}),
	],
	ImportCredentialsCommand,
);
//# sourceMappingURL=credentials.js.map
