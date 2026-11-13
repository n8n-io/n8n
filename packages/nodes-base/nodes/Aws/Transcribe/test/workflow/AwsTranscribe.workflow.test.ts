import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const job = { TranscriptionJobName: 'n8n-job-001', TranscriptionJobStatus: 'COMPLETED' };

describe('AWS Transcribe > Workflows', () => {
	const credentials = {
		aws: { region: 'eu-central-1', accessKeyId: 'test', secretAccessKey: 'test' },
	};
	const mock = nock('https://transcribe.eu-central-1.amazonaws.com');
	const post = (action: string, body: object) =>
		mock.post('/', JSON.stringify(body)).matchHeader('x-amz-target', action);

	beforeAll(() => {
		post('Transcribe.StartTranscriptionJob', {
			TranscriptionJobName: 'n8n-job-001',
			Media: { MediaFileUri: 's3://n8n-media/audio.mp3' },
			Settings: {},
			LanguageCode: 'en-US',
		}).reply(200, { TranscriptionJob: { ...job, TranscriptionJobStatus: 'IN_PROGRESS' } });
		post('Transcribe.GetTranscriptionJob', { TranscriptionJobName: 'n8n-job-001' }).reply(200, {
			TranscriptionJob: job,
		});
		post('Transcribe.ListTranscriptionJobs', { MaxResults: 5 }).reply(200, {
			TranscriptionJobSummaries: [job],
		});
		post('Transcribe.DeleteTranscriptionJob', { TranscriptionJobName: 'n8n-job-001' }).reply(
			200,
			{},
		);
	});

	afterAll(() => {
		expect(mock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['requests.workflow.json'] });
});
