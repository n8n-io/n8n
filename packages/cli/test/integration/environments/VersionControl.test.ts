import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';
import type { User } from '@db/entities/User';
import { License } from '@/License';
import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils';
import { VersionControlService } from '../../../src/environments/versionControl/versionControl.service.ee';

let owner: User;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	Container.get(License).isVersionControlLicensed = () => true;
	const app = await utils.initTestServer({ endpointGroups: ['versionControl'] });
	owner = await testDb.createOwner();
	authOwnerAgent = utils.createAuthAgent(app)(owner);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('GET /versionControl/preferences', () => {
	test('should return Version Control preferences', async () => {
		await Container.get(VersionControlService).generateAndSaveKeyPair();
		await authOwnerAgent
			.get('/versionControl/preferences')
			.expect(200)
			.expect((res) => {
				return (
					'privateKey' in res.body &&
					'publicKey' in res.body &&
					res.body.publicKey.includes('ssh-ed25519') &&
					res.body.privateKey.includes('BEGIN OPENSSH PRIVATE KEY')
				);
			});
	});
});
