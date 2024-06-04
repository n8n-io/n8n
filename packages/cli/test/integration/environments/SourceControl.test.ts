import { Container } from 'typedi';

import type { User } from '@db/entities/User';
import config from '@/config';
import { SourceControlPreferencesService } from '@/environments/sourceControl/sourceControlPreferences.service.ee';
import { SourceControlService } from '@/environments/sourceControl/sourceControl.service.ee';
import type { SourceControlledFile } from '@/environments/sourceControl/types/sourceControlledFile';
import { WaitTracker } from '@/WaitTracker';

import * as utils from '../shared/utils/';
import { createUser } from '../shared/db/users';
import { mockInstance } from '../../shared/mocking';
import type { SuperAgentTest } from '../shared/types';

let authOwnerAgent: SuperAgentTest;
let owner: User;

// This is necessary for the tests to shutdown cleanly.
mockInstance(WaitTracker);

const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);

	Container.get(SourceControlPreferencesService).isSourceControlConnected = () => true;
});

describe('GET /sourceControl/preferences', () => {
	test('should return Source Control preferences', async () => {
		await authOwnerAgent
			.get('/source-control/preferences')
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
			.get('/source-control/get-status')
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
			.post('/source-control/generate-key-pair')
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
