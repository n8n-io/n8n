import type { SuperAgentTest } from 'supertest';
import { SOURCE_CONTROL_API_ROOT } from '@/environments/sourceControl/constants';
import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils/';
import type { User } from '@db/entities/User';
import * as UserManagementHelpers from '@/UserManagement/UserManagementHelper';
import Container from 'typedi';
import config from '@/config';
import { License } from '@/License';
import { SourceControlPreferencesService } from '@/environments/sourceControl/sourceControlPreferences.service.ee';
import { SourceControlService } from '@/environments/sourceControl/sourceControl.service.ee';
import type { SourceControlledFile } from '@/environments/sourceControl/types/sourceControlledFile';

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let owner: User;
let member: User;

const sharingSpy = jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(true);

const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});

beforeAll(async () => {
	const globalOwnerRole = await testDb.getGlobalOwnerRole();
	const globalMemberRole = await testDb.getGlobalMemberRole();
	owner = await testDb.createUser({ globalRole: globalOwnerRole });
	member = await testDb.createUser({ globalRole: globalMemberRole });
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	Container.get(License).isSourceControlLicensed = () => true;
	Container.get(SourceControlPreferencesService).isSourceControlConnected = () => true;
});

describe('GET /sourceControl/preferences', () => {
	test('should return Source Control preferences', async () => {
		await authOwnerAgent
			.get(`/${SOURCE_CONTROL_API_ROOT}/preferences`)
			.expect(200)
			.expect((res) => {
				return 'repositoryUrl' in res.body && 'branchName' in res.body;
			});
	});

	test('should return repo sync status', async () => {
		Container.get(SourceControlService).getStatus = async () => {
			return [
				{
					id: 'haQetoXq9GxHSkft',
					name: 'My workflow 6 edit',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: true,
					file: '/Users/michael/.n8n/git/workflows/haQetoXq9GxHSkft.json',
					updatedAt: '2023-07-14T11:24:41.000Z',
				},
			] as SourceControlledFile[];
		};
		await authOwnerAgent
			.get(`/${SOURCE_CONTROL_API_ROOT}/get-status`)
			.query({ direction: 'push', preferLocalVersion: 'true', verbose: 'false' })
			.expect(200)
			.expect((res) => {
				const data: SourceControlledFile[] = res.body.data;
				expect(data.length).toBe(1);
				expect(data[0].id).toBe('haQetoXq9GxHSkft');
			});
	});

	test('refreshing key pairsshould return new rsa key', async () => {
		config.set('sourceControl.defaultKeyPairType', 'rsa');
		await authOwnerAgent
			.post(`/${SOURCE_CONTROL_API_ROOT}/generate-key-pair`)
			.send()
			.expect(200)
			.expect((res) => {
				expect(
					Container.get(SourceControlPreferencesService).getPreferences().keyGeneratorType,
				).toBe('rsa');
				expect(res.body.data).toHaveProperty('publicKey');
				expect(res.body.data).toHaveProperty('keyGeneratorType');
				expect(res.body.data.keyGeneratorType).toBe('rsa');
				expect(res.body.data.publicKey).toContain('ssh-rsa');
			});
	});
});
