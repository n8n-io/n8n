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
Object.defineProperty(exports, '__esModule', { value: true });
exports.getCredentialById = void 0;
exports.encryptCredentialData = encryptCredentialData;
exports.decryptCredentialData = decryptCredentialData;
exports.createManyCredentials = createManyCredentials;
exports.createCredentials = createCredentials;
exports.saveCredential = saveCredential;
exports.shareCredentialWithUsers = shareCredentialWithUsers;
exports.shareCredentialWithProjects = shareCredentialWithProjects;
exports.affixRoleToSaveCredential = affixRoleToSaveCredential;
exports.getAllCredentials = getAllCredentials;
exports.getAllSharedCredentials = getAllSharedCredentials;
exports.getCredentialSharings = getCredentialSharings;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
async function encryptCredentialData(credential) {
	const { createCredentialsFromCredentialsEntity } = await Promise.resolve().then(() =>
		__importStar(require('@/credentials-helper')),
	);
	const coreCredential = createCredentialsFromCredentialsEntity(credential, true);
	coreCredential.setData(credential.data);
	return Object.assign(credential, coreCredential.getDataToSave());
}
async function decryptCredentialData(credential) {
	const { createCredentialsFromCredentialsEntity } = await Promise.resolve().then(() =>
		__importStar(require('@/credentials-helper')),
	);
	const coreCredential = createCredentialsFromCredentialsEntity(credential);
	return coreCredential.getData();
}
const emptyAttributes = {
	name: 'test',
	type: 'test',
	data: '',
};
async function createManyCredentials(amount, attributes = emptyAttributes) {
	return await Promise.all(
		Array(amount)
			.fill(0)
			.map(async () => await createCredentials(attributes)),
	);
}
async function createCredentials(attributes = emptyAttributes, project) {
	const credentialsRepository = di_1.Container.get(db_1.CredentialsRepository);
	const credentials = await credentialsRepository.save(credentialsRepository.create(attributes));
	if (project) {
		await di_1.Container.get(db_1.SharedCredentialsRepository).save(
			di_1.Container.get(db_1.SharedCredentialsRepository).create({
				project,
				credentials,
				role: 'credential:owner',
			}),
		);
	}
	return credentials;
}
async function saveCredential(credentialPayload, options) {
	const role = options.role;
	const newCredential = new db_1.CredentialsEntity();
	Object.assign(newCredential, credentialPayload);
	await encryptCredentialData(newCredential);
	const savedCredential = await di_1.Container.get(db_1.CredentialsRepository).save(newCredential);
	savedCredential.data = newCredential.data;
	if ('user' in options) {
		const user = options.user;
		const personalProject = await di_1.Container.get(
			db_1.ProjectRepository,
		).getPersonalProjectForUserOrFail(user.id);
		await di_1.Container.get(db_1.SharedCredentialsRepository).save({
			user,
			credentials: savedCredential,
			role,
			project: personalProject,
		});
	} else {
		const project = options.project;
		await di_1.Container.get(db_1.SharedCredentialsRepository).save({
			credentials: savedCredential,
			role,
			project,
		});
	}
	return savedCredential;
}
async function shareCredentialWithUsers(credential, users) {
	const newSharedCredentials = await Promise.all(
		users.map(async (user) => {
			const personalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(user.id);
			return di_1.Container.get(db_1.SharedCredentialsRepository).create({
				credentialsId: credential.id,
				role: 'credential:user',
				projectId: personalProject.id,
			});
		}),
	);
	return await di_1.Container.get(db_1.SharedCredentialsRepository).save(newSharedCredentials);
}
async function shareCredentialWithProjects(credential, projects) {
	const newSharedCredentials = await Promise.all(
		projects.map(async (project) => {
			return di_1.Container.get(db_1.SharedCredentialsRepository).create({
				credentialsId: credential.id,
				role: 'credential:user',
				projectId: project.id,
			});
		}),
	);
	return await di_1.Container.get(db_1.SharedCredentialsRepository).save(newSharedCredentials);
}
function affixRoleToSaveCredential(role) {
	return async (credentialPayload, options) =>
		await saveCredential(credentialPayload, { ...options, role });
}
async function getAllCredentials() {
	return await di_1.Container.get(db_1.CredentialsRepository).find();
}
const getCredentialById = async (id) =>
	await di_1.Container.get(db_1.CredentialsRepository).findOneBy({ id });
exports.getCredentialById = getCredentialById;
async function getAllSharedCredentials() {
	return await di_1.Container.get(db_1.SharedCredentialsRepository).find();
}
async function getCredentialSharings(credential) {
	return await di_1.Container.get(db_1.SharedCredentialsRepository).findBy({
		credentialsId: credential.id,
	});
}
//# sourceMappingURL=credentials.js.map
