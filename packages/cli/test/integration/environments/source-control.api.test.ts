import type { SourceControlledFile } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';
import { Telemetry } from '@/telemetry';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

let authOwnerAgent: SuperAgentTest;
let owner: User;

mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});

let sourceControlPreferencesService: SourceControlPreferencesService;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);

	sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
	await sourceControlPreferencesService.setPreferences({
		connected: true,
		keyGeneratorType: 'rsa',
	});
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
		const res = await authOwnerAgent.post('/source-control/generate-key-pair').send().expect(200);

		expect(res.body.data).toHaveProperty('publicKey');
		expect(res.body.data).toHaveProperty('keyGeneratorType');
		expect(res.body.data.keyGeneratorType).toBe('rsa');
		expect(res.body.data.publicKey).toContain('ssh-rsa');
	});
});
