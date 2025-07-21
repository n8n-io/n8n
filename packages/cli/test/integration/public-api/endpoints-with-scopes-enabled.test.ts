import type { CredentialPayload } from '@n8n/backend-test-utils';
import {
	createTeamProject,
	getProjectByNameOrFail,
	createWorkflow,
	randomName,
	testDb,
} from '@n8n/backend-test-utils';
import type { TagEntity, Variables } from '@n8n/db';
import {
	ApiKeyRepository,
	CredentialsRepository,
	ProjectRepository,
	TagRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { getOwnerOnlyApiKeyScopes } from '@n8n/permissions';
import { randomString } from 'n8n-workflow';
import validator from 'validator';

import { affixRoleToSaveCredential, createCredentials } from '@test-integration/db/credentials';
import { createErrorExecution, createSuccessfulExecution } from '@test-integration/db/executions';
import { createTag } from '@test-integration/db/tags';
import {
	createAdminWithApiKey,
	createMember,
	createMemberWithApiKey,
	createOwnerWithApiKey,
	createUser,
	getUserById,
} from '@test-integration/db/users';
import { createVariable, getVariableByIdOrFail } from '@test-integration/db/variables';
import type { SaveCredentialFunction } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

import * as utils from '../shared/utils';

let saveCredential: SaveCredentialFunction;

const credentialPayload = (): CredentialPayload => ({
	name: randomName(),
	type: 'githubApi',
	data: {
		accessToken: randomString(6, 16),
		server: randomString(1, 10),
		user: randomString(1, 10),
	},
});

describe('Public API endpoints with feat:apiKeyScopes enabled', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: [
			'feat:advancedPermissions',
			'feat:apiKeyScopes',
			'feat:variables',
			'feat:projectRole:admin',
		],
		quotas: {
			'quota:users': -1,
			'quota:maxTeamProjects': -1,
		},
	});

	let apiKeyRepository: ApiKeyRepository;

	beforeAll(async () => {
		await utils.initCredentialsTypes();

		saveCredential = affixRoleToSaveCredential('credential:owner');

		await testDb.init();
		apiKeyRepository = Container.get(ApiKeyRepository);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'User',
			'SharedCredentials',
			'CredentialsEntity',
			'ExecutionEntity',
			'SharedWorkflow',
			'TagEntity',
			'Variables',
			'Project',
			'WorkflowEntity',
			'WorkflowHistory',
		]);
		// globalConfig.tags.disabled = false;
	});

	describe('with "feat:apiKeyScopes" enabled', () => {
		describe('users', () => {
			describe('GET /user', () => {
				test('should return the user when API key has "user:read" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['user:read'] });

					await createUser();

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const response = await authOwnerAgent.get(`/users/${owner.id}`).expect(200);

					const {
						id,
						email,
						firstName,
						lastName,
						personalizationAnswers,
						role,
						password,
						isPending,
						createdAt,
						updatedAt,
					} = response.body;

					expect(validator.isUUID(id)).toBe(true);
					expect(email).toBeDefined();
					expect(firstName).toBeDefined();
					expect(lastName).toBeDefined();
					expect(personalizationAnswers).toBeUndefined();
					expect(password).toBeUndefined();
					expect(isPending).toBe(false);
					expect(role).toBeUndefined();
					expect(createdAt).toBeDefined();
					expect(updatedAt).toBeDefined();
				});

				test('should fail to return the user when API key doesn\'t have "user:read" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['tag:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const response = await authOwnerAgent.get(`/users/${owner.id}`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('GET /users', () => {
				test('should return all users when API key has "user:list" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['user:list'] });

					await createUser();

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const response = await authOwnerAgent.get('/users').expect(200);
					expect(response.body.data.length).toBe(2);
					expect(response.body.nextCursor).toBeNull();

					for (const user of response.body.data) {
						const {
							id,
							email,
							firstName,
							lastName,
							personalizationAnswers,
							role,
							password,
							isPending,
							createdAt,
							updatedAt,
						} = user;

						expect(validator.isUUID(id)).toBe(true);
						expect(email).toBeDefined();
						expect(firstName).toBeDefined();
						expect(lastName).toBeDefined();
						expect(personalizationAnswers).toBeUndefined();
						expect(password).toBeUndefined();
						expect(isPending).toBe(false);
						expect(role).toBeUndefined();
						expect(createdAt).toBeDefined();
						expect(updatedAt).toBeDefined();
					}
				});
			});

			test('should fail when "feat:apiKeyScopes" is disabled and API key does not have "user:list" scope', async () => {
				const member = await createMemberWithApiKey({ scopes: ['user:read'] });

				await createUser();

				const authMemberAgent = testServer.publicApiAgentFor(member);

				await authMemberAgent.get('/users').expect(403);
			});

			describe('POST /users', () => {
				test('should create user when API key has "user:create" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['user:create'] });
					const payload = [{ email: 'test@test.com', role: 'global:admin' }];

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(owner).post('/users').send(payload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(201);

					expect(response.body).toHaveLength(1);

					const [result] = response.body;
					const { user: returnedUser, error } = result;
					const payloadUser = payload[0];

					expect(returnedUser).toHaveProperty('email', payload[0].email);
					expect(typeof returnedUser.inviteAcceptUrl).toBe('string');
					expect(typeof returnedUser.emailSent).toBe('boolean');
					expect(error).toBe('');

					const storedUser = await getUserById(returnedUser.id);
					expect(returnedUser.id).toBe(storedUser.id);
					expect(returnedUser.email).toBe(storedUser.email);
					expect(returnedUser.email).toBe(payloadUser.email);
					expect(storedUser.role).toBe(payloadUser.role);
				});

				test('should fail to create user when API key doesn\'t have "user:create" scope', async () => {
					/**
					 * Arrange
					 */

					const member = await createMemberWithApiKey();
					const payload = [{ email: 'test@test.com', role: 'global:admin' }];

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(member).post('/users').send(payload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});

			describe('PATCH /users/:id/role', () => {
				test('should change role when API key has "user:changeRole" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['user:changeRole'] });
					const member = await createMember();
					const payload = { newRoleName: 'global:admin' };

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.patch(`/users/${member.id}/role`)
						.send(payload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(204);
					const storedUser = await getUserById(member.id);
					expect(storedUser.role).toBe(payload.newRoleName);
				});

				test('should fail to change role when API key doesn\'t have "user:changeRole" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					const member = await createMember();
					const payload = { newRoleName: 'global:admin' };

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.patch(`/users/${member.id}/role`)
						.send(payload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});

				it('should remove all admin only scopes when user downgrading to member', async () => {
					/**
					 * Arrange
					 */
					testServer.license.enable('feat:advancedPermissions');

					const owner = await createOwnerWithApiKey({ scopes: ['user:changeRole'] });
					const admin = await createAdminWithApiKey();
					const payload = { newRoleName: 'global:member' };

					const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.patch(`/users/${admin.id}/role`)
						.send(payload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(204);

					const formerAdminApiKey = await apiKeyRepository.findOneByOrFail({ userId: admin.id });
					for (const ownerScope of ownerOnlyScopes) {
						expect(formerAdminApiKey.scopes).not.toContain(ownerScope);
					}
				});
			});

			describe('DELETE /users/:id', () => {
				test('should delete user when API key has "user:delete" scope', async () => {
					/**
					 * Arrange
					 */
					testServer.license.enable('feat:advancedPermissions');
					testServer.license.enable('feat:apiKeyScopes');
					const owner = await createOwnerWithApiKey({ scopes: ['user:delete'] });
					const member = await createMember();

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(owner).delete(`/users/${member.id}`);

					/**
					 * Assert
					 */
					expect(response.status).toBe(204);
					await expect(getUserById(member.id)).rejects.toThrow();
				});

				test('should fail to create user when API key doesn\'t have "user:delete" scope', async () => {
					/**
					 * Arrange
					 */
					testServer.license.enable('feat:advancedPermissions');
					testServer.license.enable('feat:apiKeyScopes');
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					const member = await createMember();

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(owner).delete(`/users/${member.id}`);

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});
		});

		describe('credentials', () => {
			describe('POST /credentials', () => {
				test('should fail to create credential when API key doesn\'t have "credential:create" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['tag:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const payload = {
						name: 'test credential',
						type: 'githubApi',
						data: {
							accessToken: 'abcdefghijklmnopqrstuvwxyz',
							user: 'test',
							server: 'testServer',
						},
					};

					const response = await authOwnerAgent.post('/credentials').send(payload);

					expect(response.statusCode).toBe(403);
				});

				test('should create credential when API key has "credential:create" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const payload = {
						name: 'test credential',
						type: 'githubApi',
						data: {
							accessToken: 'abcdefghijklmnopqrstuvwxyz',
							user: 'test',
							server: 'testServer',
						},
					};

					const response = await authOwnerAgent.post('/credentials').send(payload);

					expect(response.statusCode).toBe(200);
					const { id, name, type } = response.body;

					expect(name).toBe(payload.name);
					expect(type).toBe(payload.type);

					const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

					expect(credential.name).toBe(payload.name);
					expect(credential.type).toBe(payload.type);
					expect(credential.data).not.toBe(payload.data);

					const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
						relations: { credentials: true },
						where: {
							credentialsId: credential.id,
							project: {
								type: 'personal',
								projectRelations: {
									userId: owner.id,
								},
							},
						},
					});

					expect(sharedCredential.role).toEqual('credential:owner');
					expect(sharedCredential.credentials.name).toBe(payload.name);
				});
			});
			describe('DELETE /credentials/:id', () => {
				test('should delete credential when API key has "credential:delete" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['credential:delete'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const savedCredential = await saveCredential(credentialPayload(), { user: owner });

					const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

					expect(response.statusCode).toBe(200);

					const { name, type } = response.body;

					expect(name).toBe(savedCredential.name);
					expect(type).toBe(savedCredential.type);

					const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
						id: savedCredential.id,
					});

					expect(deletedCredential).toBeNull(); // deleted

					const deletedSharedCredential = await Container.get(
						SharedCredentialsRepository,
					).findOneBy({});

					expect(deletedSharedCredential).toBeNull(); // deleted
				});

				test('should delete credential when API key doesn\'t have "credential:create" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['tag:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const savedCredential = await saveCredential(credentialPayload(), { user: owner });

					const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('PUT /credentials/:id/transfer', () => {
				test('should transfer credential when API key has "credential:move" scope', async () => {
					/**
					 * Arrange
					 */

					const owner = await createOwnerWithApiKey({ scopes: ['credential:move'] });
					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const [firstProject, secondProject] = await Promise.all([
						createTeamProject('first-project', owner),
						createTeamProject('second-project', owner),
					]);

					const credentials = await createCredentials(
						{ name: 'Test', type: 'test', data: '' },
						firstProject,
					);

					/**
					 * Act
					 */
					const response = await authOwnerAgent
						.put(`/credentials/${credentials.id}/transfer`)
						.send({
							destinationProjectId: secondProject.id,
						});

					/**
					 * Assert
					 */
					expect(response.statusCode).toBe(204);
				});

				test('should fail to transfer credential when API key doesn\'t have "credential:move" scope', async () => {
					/**
					 * Arrange
					 */

					const owner = await createOwnerWithApiKey({ scopes: ['tag:create'] });
					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const [firstProject, secondProject] = await Promise.all([
						createTeamProject('first-project', owner),
						createTeamProject('second-project', owner),
					]);

					const credentials = await createCredentials(
						{ name: 'Test', type: 'test', data: '' },
						firstProject,
					);

					/**
					 * Act
					 */
					const response = await authOwnerAgent
						.put(`/credentials/${credentials.id}/transfer`)
						.send({
							destinationProjectId: secondProject.id,
						});

					/**
					 * Assert
					 */
					expect(response.statusCode).toBe(403);
				});
			});
		});

		describe('executions', () => {
			describe('GET /executions/:id', () => {
				test('should retrieve execution when API key has "execution:read" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['execution:read'] });
					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const workflow = await createWorkflow({}, owner);

					const execution = await createSuccessfulExecution(workflow);

					const response = await authOwnerAgent.get(`/executions/${execution.id}`);

					expect(response.statusCode).toBe(200);

					const {
						id,
						finished,
						mode,
						retryOf,
						retrySuccessId,
						startedAt,
						stoppedAt,
						workflowId,
						waitTill,
					} = response.body;

					expect(id).toBeDefined();
					expect(finished).toBe(true);
					expect(mode).toEqual(execution.mode);
					expect(retrySuccessId).toBeNull();
					expect(retryOf).toBeNull();
					expect(startedAt).not.toBeNull();
					expect(stoppedAt).not.toBeNull();
					expect(workflowId).toBe(execution.workflowId);
					expect(waitTill).toBeNull();
				});

				test('should fail to retrieve credential API key doesn\'t have "execution:read" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['tag:create'] });
					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const workflow = await createWorkflow({}, owner);

					const execution = await createSuccessfulExecution(workflow);

					const response = await authOwnerAgent.get(`/executions/${execution.id}`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('DELETE /executions/:id', () => {
				test('should delete execution when API key has "execution:delete" scope', async () => {
					const owner = await createOwnerWithApiKey({
						scopes: ['execution:delete', 'execution:read'],
					});
					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const workflow = await createWorkflow({}, owner);
					const execution = await createSuccessfulExecution(workflow);

					const response = await authOwnerAgent.delete(`/executions/${execution.id}`);

					expect(response.statusCode).toBe(200);

					const {
						id,
						finished,
						mode,
						retryOf,
						retrySuccessId,
						startedAt,
						stoppedAt,
						workflowId,
						waitTill,
					} = response.body;

					expect(id).toBeDefined();
					expect(finished).toBe(true);
					expect(mode).toEqual(execution.mode);
					expect(retrySuccessId).toBeNull();
					expect(retryOf).toBeNull();
					expect(startedAt).not.toBeNull();
					expect(stoppedAt).not.toBeNull();
					expect(workflowId).toBe(execution.workflowId);
					expect(waitTill).toBeNull();

					await authOwnerAgent.get(`/executions/${execution.id}`).expect(404);
				});

				test('should fail to delete execution when API key doesn\'t have "execution:delete" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['tag:create'] });
					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const workflow = await createWorkflow({}, owner);
					const execution = await createSuccessfulExecution(workflow);

					const response = await authOwnerAgent.delete(`/executions/${execution.id}`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('GET /executions', () => {
				test('should retrieve all executions when API key has "execution:list" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['execution:list'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const workflow = await createWorkflow({}, owner);

					const successfulExecution = await createSuccessfulExecution(workflow);

					await createErrorExecution(workflow);

					const response = await authOwnerAgent.get('/executions').query({
						status: 'success',
					});

					expect(response.statusCode).toBe(200);
					expect(response.body.data.length).toBe(1);
					expect(response.body.nextCursor).toBe(null);

					const {
						id,
						finished,
						mode,
						retryOf,
						retrySuccessId,
						startedAt,
						stoppedAt,
						workflowId,
						waitTill,
					} = response.body.data[0];

					expect(id).toBeDefined();
					expect(finished).toBe(true);
					expect(mode).toEqual(successfulExecution.mode);
					expect(retrySuccessId).toBeNull();
					expect(retryOf).toBeNull();
					expect(startedAt).not.toBeNull();
					expect(stoppedAt).not.toBeNull();
					expect(workflowId).toBe(successfulExecution.workflowId);
					expect(waitTill).toBeNull();
				});

				test('should fail to retrieve all executions when API key doesn\'t have "execution:list" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['tag:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const workflow = await createWorkflow({}, owner);

					await createErrorExecution(workflow);

					const response = await authOwnerAgent.get('/executions').query({
						status: 'success',
					});

					expect(response.statusCode).toBe(403);
				});
			});
		});

		describe('tags', () => {
			describe('GET /tags', () => {
				test('should retrieve all tags when API key has "tag:list" scope', async () => {
					await Promise.all([createTag({}), createTag({}), createTag({})]);

					const owner = await createOwnerWithApiKey({ scopes: ['tag:list'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const response = await authOwnerAgent.get('/tags').query({ limit: 1 });

					expect(response.statusCode).toBe(200);
					expect(response.body.data.length).toBe(1);
					expect(response.body.nextCursor).not.toBeNull();
				});

				test('should fail to retrieve all tags when API key doesn\'t have "tag:list" scope', async () => {
					await Promise.all([createTag({}), createTag({}), createTag({})]);

					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const response = await authOwnerAgent.get('/tags').query({ limit: 1 });

					expect(response.statusCode).toBe(403);
				});
			});

			describe('POST /tags', () => {
				test('should create a tag when API key has "tag:create" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['tag:create'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const payload = {
						name: 'Tag 1',
					};

					const response = await authMemberAgent.post('/tags').send(payload);

					expect(response.statusCode).toBe(201);

					const { id, name, createdAt, updatedAt } = response.body;

					expect(id).toBeDefined();
					expect(name).toBe(payload.name);
					expect(createdAt).toBeDefined();
					expect(updatedAt).toEqual(createdAt);

					// check if created tag in DB
					const tag = await Container.get(TagRepository).findOne({
						where: {
							id,
						},
					});

					expect(tag?.name).toBe(name);
					expect(tag?.createdAt.toISOString()).toEqual(createdAt);
					expect(tag?.updatedAt.toISOString()).toEqual(updatedAt);
				});

				test('should fail to create a tag when API key doesn\'t have "tag:create" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const payload = {
						name: 'Tag 1',
					};

					const response = await authMemberAgent.post('/tags').send(payload);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('DELETE /tags/:id', () => {
				test('should delete a tag when API key has "tag:delete" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['tag:delete'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const tag = await createTag({});

					const response = await authOwnerAgent.delete(`/tags/${tag.id}`);

					expect(response.statusCode).toBe(200);

					const { id, name, createdAt, updatedAt } = response.body;

					expect(id).toEqual(tag.id);
					expect(name).toEqual(tag.name);
					expect(createdAt).toEqual(tag.createdAt.toISOString());
					expect(updatedAt).toEqual(tag.updatedAt.toISOString());

					// make sure the tag actually deleted from the db
					const deletedTag = await Container.get(TagRepository).findOneBy({
						id: tag.id,
					});

					expect(deletedTag).toBeNull();
				});

				test('should fail to delete a tag when API key doesn\'t have "tag:delete" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const tag = await createTag({});

					const response = await authOwnerAgent.delete(`/tags/${tag.id}`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('PUT /tags/:id', () => {
				test('should update a tag when API key has "tag:update" scope', async () => {
					const tag = await createTag({});

					const owner = await createOwnerWithApiKey({ scopes: ['tag:update'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const payload = {
						name: 'New name',
					};

					const response = await authOwnerAgent.put(`/tags/${tag.id}`).send(payload);

					const { id, name, updatedAt } = response.body;

					expect(response.statusCode).toBe(200);

					expect(id).toBe(tag.id);
					expect(name).toBe(payload.name);
					expect(updatedAt).not.toBe(tag.updatedAt.toISOString());

					// check updated tag in DB
					const dbTag = await Container.get(TagRepository).findOne({
						where: {
							id,
						},
					});

					expect(dbTag?.name).toBe(payload.name);
					expect(dbTag?.updatedAt.getTime()).toBeGreaterThan(tag.updatedAt.getTime());
				});

				test('should fail to update a tag when API key doesn\'t have "tag:update" scope', async () => {
					const tag = await createTag({});

					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });

					const authOwnerAgent = testServer.publicApiAgentFor(owner);

					const payload = {
						name: 'New name',
					};

					const response = await authOwnerAgent.put(`/tags/${tag.id}`).send(payload);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('GET /tags/:id', () => {
				test('should retrieve a tag when API key has "tag:read" scope', async () => {
					// create tag
					const tag = await createTag({});

					const member = await createMemberWithApiKey({ scopes: ['tag:read'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const response = await authMemberAgent.get(`/tags/${tag.id}`);

					expect(response.statusCode).toBe(200);

					const { id, name, createdAt, updatedAt } = response.body;

					expect(id).toEqual(tag.id);
					expect(name).toEqual(tag.name);
					expect(createdAt).toEqual(tag.createdAt.toISOString());
					expect(updatedAt).toEqual(tag.updatedAt.toISOString());
				});

				test('should fail to retrieve a tag when API key doesn\'t have "tag:read" scope', async () => {
					// create tag
					const tag = await createTag({});

					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const response = await authMemberAgent.get(`/tags/${tag.id}`);

					expect(response.statusCode).toBe(403);
				});
			});
		});

		describe('variables', () => {
			describe('GET /variables', () => {
				test('should retrieve all variables when API key has "variable:list" scope', async () => {
					/**
					 * Arrange
					 */
					testServer.license.enable('feat:variables');
					const owner = await createOwnerWithApiKey({ scopes: ['variable:list'] });
					const variables = await Promise.all([
						createVariable(),
						createVariable(),
						createVariable(),
					]);

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(owner).get('/variables');

					/**
					 * Assert
					 */
					expect(response.status).toBe(200);
					expect(response.body).toHaveProperty('data');
					expect(response.body).toHaveProperty('nextCursor');
					expect(Array.isArray(response.body.data)).toBe(true);
					expect(response.body.data.length).toBe(variables.length);

					variables.forEach(({ id, key, value }) => {
						expect(response.body.data).toContainEqual(expect.objectContaining({ id, key, value }));
					});
				});
				test('should fail to retrieve all variables when API key doesn\'t have "variable:read" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					await Promise.all([createVariable(), createVariable(), createVariable()]);

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(owner).get('/variables');

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});

			describe('POST /variables', () => {
				test('should create variable when API key has "variable:create" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['variable:create'] });
					const variablePayload = { key: 'key', value: 'value' };

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.post('/variables')
						.send(variablePayload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(201);
					await expect(getVariableByIdOrFail(response.body.id)).resolves.toEqual(
						expect.objectContaining(variablePayload),
					);
				});

				test('should fail to create variable when API key doesn\'t have "variable:create" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					const variablePayload = { key: 'key', value: 'value' };

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.post('/variables')
						.send(variablePayload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});

			describe('PUT /variables/:id', () => {
				const variablePayload = { key: 'updatedKey', value: 'updatedValue' };
				let variable: Variables;
				beforeEach(async () => {
					variable = await createVariable();
				});

				it('should update a variable if API key has scope "variable:update"', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['variable:update'] });

					const response = await testServer
						.publicApiAgentFor(owner)
						.put(`/variables/${variable.id}`)
						.send(variablePayload);

					expect(response.status).toBe(204);
					const updatedVariable = await getVariableByIdOrFail(variable.id);
					expect(updatedVariable).toEqual(expect.objectContaining(variablePayload));
				});

				test('should fail to update variable when API key doesn\'t have "variable:update" scope', async () => {
					const owner = await createOwnerWithApiKey({ scopes: ['variable:list'] });

					await testServer
						.publicApiAgentFor(owner)
						.put(`/variables/${variable.id}`)
						.send(variablePayload);
				});
			});
		});

		describe('projects', () => {
			describe('POST /projects', () => {
				test('should create project when API key has "project:create" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['project:create'] });
					const projectPayload = { name: 'some-project' };

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.post('/projects')
						.send(projectPayload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(201);
					expect(response.body).toEqual({
						name: 'some-project',
						icon: null,
						type: 'team',
						description: null,
						id: expect.any(String),
						createdAt: expect.any(String),
						updatedAt: expect.any(String),
						role: 'project:admin',
						scopes: expect.any(Array),
					});
					await expect(getProjectByNameOrFail(projectPayload.name)).resolves.not.toThrow();
				});

				test('should fail to create project when API key doesn\'t have "project:create" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					const projectPayload = { name: 'some-project' };

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.post('/projects')
						.send(projectPayload);

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});

			describe('GET /projects', () => {
				test('should return all projects when API key has "project:list" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['project:list'] });
					const projects = await Promise.all([
						createTeamProject(),
						createTeamProject(),
						createTeamProject(),
					]);

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(owner).get('/projects');

					/**
					 * Assert
					 */
					expect(response.status).toBe(200);
					expect(response.body).toHaveProperty('data');
					expect(response.body).toHaveProperty('nextCursor');
					expect(Array.isArray(response.body.data)).toBe(true);
					expect(response.body.data.length).toBe(projects.length + 1); // +1 for the owner's personal project

					projects.forEach(({ id, name }) => {
						expect(response.body.data).toContainEqual(expect.objectContaining({ id, name }));
					});
				});
				test('should fail to create project when API key doesn\'t have "project:list" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					await Promise.all([createTeamProject(), createTeamProject(), createTeamProject()]);

					/**
					 * Act
					 */
					const response = await testServer.publicApiAgentFor(owner).get('/projects');

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});

			describe('DELETE /projects/:id', () => {
				test('should delete a project when API key has "project:delete" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['project:delete'] });
					const project = await createTeamProject();

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.delete(`/projects/${project.id}`);

					/**
					 * Assert
					 */
					expect(response.status).toBe(204);
					await expect(getProjectByNameOrFail(project.id)).rejects.toThrow();
				});

				test('should fail to delete a project when API key doesn\'t have "project:delete" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					const project = await createTeamProject();

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.delete(`/projects/${project.id}`);

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});

			describe('PUT /projects/:id', () => {
				test('should update a project when API key has "project:update" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['project:update'] });
					const project = await createTeamProject('old-name');

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.put(`/projects/${project.id}`)
						.send({ name: 'new-name' });

					/**
					 * Assert
					 */
					expect(response.status).toBe(204);
					await expect(getProjectByNameOrFail('new-name')).resolves.not.toThrow();
				});

				test('should fail to update a project when API key doesn\'t have "project:update" scope', async () => {
					/**
					 * Arrange
					 */
					const owner = await createOwnerWithApiKey({ scopes: ['credential:create'] });
					const project = await createTeamProject('old-name');

					/**
					 * Act
					 */
					const response = await testServer
						.publicApiAgentFor(owner)
						.put(`/projects/${project.id}`)
						.send({ name: 'new-name' });

					/**
					 * Assert
					 */
					expect(response.status).toBe(403);
				});
			});
		});

		describe('workflows', () => {
			describe('POST /workflows', () => {
				test('should create workflow when API key has "workflow:create" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['workflow:create'] });
					const memberPersonalProject = await Container.get(
						ProjectRepository,
					).getPersonalProjectForUserOrFail(member.id);
					const authMemberAgent = testServer.publicApiAgentFor(member);

					const payload = {
						name: 'testing',
						nodes: [
							{
								id: 'uuid-1234',
								parameters: {},
								name: 'Start',
								type: 'n8n-nodes-base.start',
								typeVersion: 1,
								position: [240, 300],
							},
						],
						connections: {},
						staticData: null,
						settings: {
							saveExecutionProgress: true,
							saveManualExecutions: true,
							saveDataErrorExecution: 'all',
							saveDataSuccessExecution: 'all',
							executionTimeout: 3600,
							timezone: 'America/New_York',
							executionOrder: 'v1',
						},
					};

					const response = await authMemberAgent.post('/workflows').send(payload);

					expect(response.statusCode).toBe(200);

					const {
						id,
						name,
						nodes,
						connections,
						staticData,
						active,
						settings,
						createdAt,
						updatedAt,
					} = response.body;

					expect(id).toBeDefined();
					expect(name).toBe(payload.name);
					expect(connections).toEqual(payload.connections);
					expect(settings).toEqual(payload.settings);
					expect(staticData).toEqual(payload.staticData);
					expect(nodes).toEqual(payload.nodes);
					expect(active).toBe(false);
					expect(createdAt).toBeDefined();
					expect(updatedAt).toEqual(createdAt);

					// check if created workflow in DB
					const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
						where: {
							projectId: memberPersonalProject.id,
							workflowId: response.body.id,
						},
						relations: ['workflow'],
					});

					expect(sharedWorkflow?.workflow.name).toBe(name);
					expect(sharedWorkflow?.workflow.createdAt.toISOString()).toBe(createdAt);
					expect(sharedWorkflow?.role).toEqual('workflow:owner');
				});

				test('should fail to create a workflow when API key doesn\'t have "workflow:create" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });
					const authMemberAgent = testServer.publicApiAgentFor(member);

					const payload = {
						name: 'testing',
						nodes: [
							{
								id: 'uuid-1234',
								parameters: {},
								name: 'Start',
								type: 'n8n-nodes-base.start',
								typeVersion: 1,
								position: [240, 300],
							},
						],
						connections: {},
						staticData: null,
						settings: {
							saveExecutionProgress: true,
							saveManualExecutions: true,
							saveDataErrorExecution: 'all',
							saveDataSuccessExecution: 'all',
							executionTimeout: 3600,
							timezone: 'America/New_York',
							executionOrder: 'v1',
						},
					};

					const response = await authMemberAgent.post('/workflows').send(payload);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('GET /workflows', () => {
				test('should retrieve all workflows when API key has "workflow:list" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['workflow:list'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					await Promise.all([
						createWorkflow({}, member),
						createWorkflow({}, member),
						createWorkflow({}, member),
					]);

					const response = await authMemberAgent.get('/workflows');

					expect(response.statusCode).toBe(200);
					expect(response.body.data.length).toBe(3);
					expect(response.body.nextCursor).toBeNull();

					for (const workflow of response.body.data) {
						const {
							id,
							connections,
							active,
							staticData,
							nodes,
							settings,
							name,
							createdAt,
							updatedAt,
							tags,
						} = workflow;

						expect(id).toBeDefined();
						expect(name).toBeDefined();
						expect(connections).toBeDefined();
						expect(active).toBe(false);
						expect(staticData).toBeDefined();
						expect(nodes).toBeDefined();
						expect(tags).toBeDefined();
						expect(settings).toBeDefined();
						expect(createdAt).toBeDefined();
						expect(updatedAt).toBeDefined();
					}
				});

				test('should fail to retrieve all workflows when API key doesn\'t have "workflow:create" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					await Promise.all([
						createWorkflow({}, member),
						createWorkflow({}, member),
						createWorkflow({}, member),
					]);

					const response = await authMemberAgent.get('/workflows');

					expect(response.statusCode).toBe(403);
				});
			});

			describe('GET /workflows/:id', () => {
				test('should retrieve a workflow when API key has "workflow:read" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['workflow:read'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const workflow = await createWorkflow({}, member);

					const response = await authMemberAgent.get(`/workflows/${workflow.id}`);

					expect(response.statusCode).toBe(200);

					const {
						id,
						connections,
						active,
						staticData,
						nodes,
						settings,
						name,
						createdAt,
						updatedAt,
						tags,
					} = response.body;

					expect(id).toEqual(workflow.id);
					expect(name).toEqual(workflow.name);
					expect(connections).toEqual(workflow.connections);
					expect(active).toBe(false);
					expect(staticData).toEqual(workflow.staticData);
					expect(nodes).toEqual(workflow.nodes);
					expect(tags).toEqual([]);
					expect(settings).toEqual(workflow.settings);
					expect(createdAt).toEqual(workflow.createdAt.toISOString());
					expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
				});

				test('should fail to retrieve a workflow when API key doesn\'t have "workflow:read" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const workflow = await createWorkflow({}, member);

					const response = await authMemberAgent.get(`/workflows/${workflow.id}`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('DELETE /workflows/:id', () => {
				test('should delete a workflow when API key has "workflow:delete" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['workflow:delete'] });
					const authMemberAgent = testServer.publicApiAgentFor(member);
					const workflow = await createWorkflow({}, member);

					const response = await authMemberAgent.delete(`/workflows/${workflow.id}`);

					expect(response.statusCode).toBe(200);

					const {
						id,
						connections,
						active,
						staticData,
						nodes,
						settings,
						name,
						createdAt,
						updatedAt,
					} = response.body;

					expect(id).toEqual(workflow.id);
					expect(name).toEqual(workflow.name);
					expect(connections).toEqual(workflow.connections);
					expect(active).toBe(false);
					expect(staticData).toEqual(workflow.staticData);
					expect(nodes).toEqual(workflow.nodes);
					expect(settings).toEqual(workflow.settings);
					expect(createdAt).toEqual(workflow.createdAt.toISOString());
					expect(updatedAt).toEqual(workflow.updatedAt.toISOString());

					// make sure the workflow actually deleted from the db
					const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOneBy({
						workflowId: workflow.id,
					});

					expect(sharedWorkflow).toBeNull();
				});

				test('should fail to delete a workflow when API key doesn\'t have "workflow:delete" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });
					const authMemberAgent = testServer.publicApiAgentFor(member);
					const workflow = await createWorkflow({}, member);

					const response = await authMemberAgent.delete(`/workflows/${workflow.id}`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('PUT /workflows/:id', () => {
				test('should update workflow when API key has "workflow:update" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['workflow:update'] });

					const memberPersonalProject = await Container.get(
						ProjectRepository,
					).getPersonalProjectForUserOrFail(member.id);

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const workflow = await createWorkflow({}, member);
					const payload = {
						name: 'name updated',
						nodes: [
							{
								id: 'uuid-1234',
								parameters: {},
								name: 'Start',
								type: 'n8n-nodes-base.start',
								typeVersion: 1,
								position: [240, 300],
							},
							{
								id: 'uuid-1234',
								parameters: {},
								name: 'Cron',
								type: 'n8n-nodes-base.cron',
								typeVersion: 1,
								position: [400, 300],
							},
						],
						connections: {},
						staticData: '{"id":1}',
						settings: {
							saveExecutionProgress: false,
							saveManualExecutions: false,
							saveDataErrorExecution: 'all',
							saveDataSuccessExecution: 'all',
							executionTimeout: 3600,
							timezone: 'America/New_York',
						},
					};

					const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);

					const {
						id,
						name,
						nodes,
						connections,
						staticData,
						active,
						settings,
						createdAt,
						updatedAt,
					} = response.body;

					expect(response.statusCode).toBe(200);

					expect(id).toBe(workflow.id);
					expect(name).toBe(payload.name);
					expect(connections).toEqual(payload.connections);
					expect(settings).toEqual(payload.settings);
					expect(staticData).toMatchObject(JSON.parse(payload.staticData));
					expect(nodes).toEqual(payload.nodes);
					expect(active).toBe(false);
					expect(createdAt).toBe(workflow.createdAt.toISOString());
					expect(updatedAt).not.toBe(workflow.updatedAt.toISOString());

					// check updated workflow in DB
					const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
						where: {
							projectId: memberPersonalProject.id,
							workflowId: response.body.id,
						},
						relations: ['workflow'],
					});

					expect(sharedWorkflow?.workflow.name).toBe(payload.name);
					expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
						workflow.updatedAt.getTime(),
					);
				});

				test('should fail to update workflow when API key doesn\'t have "workflow:update" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const workflow = await createWorkflow({}, member);
					const payload = {
						name: 'name updated',
						nodes: [
							{
								id: 'uuid-1234',
								parameters: {},
								name: 'Start',
								type: 'n8n-nodes-base.start',
								typeVersion: 1,
								position: [240, 300],
							},
							{
								id: 'uuid-1234',
								parameters: {},
								name: 'Cron',
								type: 'n8n-nodes-base.cron',
								typeVersion: 1,
								position: [400, 300],
							},
						],
						connections: {},
						staticData: '{"id":1}',
						settings: {
							saveExecutionProgress: false,
							saveManualExecutions: false,
							saveDataErrorExecution: 'all',
							saveDataSuccessExecution: 'all',
							executionTimeout: 3600,
							timezone: 'America/New_York',
						},
					};

					const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('GET /workflows/:id/tags', () => {
				test('should retrieve all workflow tags when API key has "workflowTags:list" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['workflowTags:list'] });
					const authMemberAgent = testServer.publicApiAgentFor(member);

					const tags = await Promise.all([await createTag({}), await createTag({})]);

					const workflow = await createWorkflow({ tags }, member);

					const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);

					expect(response.statusCode).toBe(200);
					expect(response.body.length).toBe(2);

					for (const tag of response.body) {
						const { id, name, createdAt, updatedAt } = tag;

						expect(id).toBeDefined();
						expect(name).toBeDefined();
						expect(createdAt).toBeDefined();
						expect(updatedAt).toBeDefined();

						tags.forEach((tag: TagEntity) => {
							expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
						});
					}
				});

				test('should fail to retrieve all workflow tags when API key doesn\'t have "workflowTags:list" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });
					const authMemberAgent = testServer.publicApiAgentFor(member);

					const tags = await Promise.all([await createTag({}), await createTag({})]);

					const workflow = await createWorkflow({ tags }, member);

					const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);

					expect(response.statusCode).toBe(403);
				});
			});

			describe('PUT /workflows/:id/tags', () => {
				test('should update workflow tags when API key has "workflowTags:update" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['workflowTags:update'] });

					const memberPersonalProject = await Container.get(
						ProjectRepository,
					).getPersonalProjectForUserOrFail(member.id);

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const workflow = await createWorkflow({}, member);
					const tags = await Promise.all([await createTag({}), await createTag({})]);

					const payload = [
						{
							id: tags[0].id,
						},
						{
							id: tags[1].id,
						},
					];

					const response = await authMemberAgent
						.put(`/workflows/${workflow.id}/tags`)
						.send(payload);

					expect(response.statusCode).toBe(200);
					expect(response.body.length).toBe(2);

					for (const tag of response.body) {
						const { id, name, createdAt, updatedAt } = tag;

						expect(id).toBeDefined();
						expect(name).toBeDefined();
						expect(createdAt).toBeDefined();
						expect(updatedAt).toBeDefined();

						tags.forEach((tag: TagEntity) => {
							expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
						});
					}

					// Check the association in DB
					const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
						where: {
							projectId: memberPersonalProject.id,
							workflowId: workflow.id,
						},
						relations: ['workflow.tags'],
					});

					expect(sharedWorkflow?.workflow.tags).toBeDefined();
					expect(sharedWorkflow?.workflow.tags?.length).toBe(2);
					if (sharedWorkflow?.workflow.tags !== undefined) {
						for (const tag of sharedWorkflow?.workflow.tags) {
							const { id, name, createdAt, updatedAt } = tag;

							expect(id).toBeDefined();
							expect(name).toBeDefined();
							expect(createdAt).toBeDefined();
							expect(updatedAt).toBeDefined();

							tags.forEach((tag: TagEntity) => {
								expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
							});
						}
					}
				});

				test('should fail to update workflow tags when API key doesn\'t have "workflowTags:update" scope', async () => {
					const member = await createMemberWithApiKey({ scopes: ['credential:create'] });

					const authMemberAgent = testServer.publicApiAgentFor(member);

					const workflow = await createWorkflow({}, member);
					const tags = await Promise.all([await createTag({}), await createTag({})]);

					const payload = [
						{
							id: tags[0].id,
						},
						{
							id: tags[1].id,
						},
					];

					const response = await authMemberAgent
						.put(`/workflows/${workflow.id}/tags`)
						.send(payload);

					expect(response.statusCode).toBe(403);
				});
			});
		});
	});
});
