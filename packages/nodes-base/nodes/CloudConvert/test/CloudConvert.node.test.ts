import nock from 'nock';
import { testWorkflows, getWorkflowFilenames, initBinaryDataManager } from '@test/nodes/Helpers';
import { FAKE_CREDENTIALS_DATA } from '@test/nodes/FakeCredentialsMap';

describe('Test CloudConvert Node', () => {
	beforeEach(async () => {
		await initBinaryDataManager();
	});
	beforeAll(() => {
		nock.disableNetConnect();

		const { apiUrl, syncApiUrl, storageUrl } = FAKE_CREDENTIALS_DATA.cloudConvertApi;

		nock(apiUrl)
			.persist(true)
			.post('/v2/jobs')
			.reply(200, {
				data: {
					id: 'fake-id',
					status: 'waiting',
					tasks: [
						{
							operation: 'import/upload',
							status: 'waiting',
							result: {
								form: {
									url: storageUrl + '/upload',
									parameters: {
										some: 'value',
									},
								},
							},
						},
						{
							operation: 'convert',
							status: 'waiting',
						},
						{
							operation: 'export/url',
							status: 'waiting',
						},
					],
				},
			});

		nock(syncApiUrl)
			.persist()
			.get('/v2/jobs/fake-id')
			.reply(200, {
				data: {
					id: 'fake-id',
					status: 'finished',
					tasks: [
						{
							operation: 'import/upload',
							status: 'finished',
						},
						{
							operation: 'convert',
							status: 'finished',
						},
						{
							operation: 'export/url',
							status: 'finished',
							result: {
								files: [
									{
										filename: 'output.txt',
										url: storageUrl + '/files/fake-id/output.txt',
									},
								],
							},
						},
						{
							operation: 'metadata',
							status: 'finished',
							result: {
								metadata: {
									some: 'metadata',
								},
							},
						},
					],
				},
			});

		const storageMock = nock(storageUrl);

		storageMock.persist().post('/upload').reply(200, {
			data: '',
		});

		storageMock.persist().get('/files/fake-id/output.txt').reply(
			200,
			{
				data: 'output',
			},
			{
				'Content-Type': 'text/plain',
			},
		);
	});

	afterAll(() => {
		nock.restore();
	});

	const workflows = getWorkflowFilenames(__dirname);
	testWorkflows(workflows);
});
