import nock from 'nock';
import { getWorkflowFilenames, initBinaryDataManager, testWorkflows } from '@test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test S3 Node', () => {
	describe('File Upload', () => {
		let mock: nock.Scope;
		const now = 1683028800000;

		beforeAll(async () => {
			jest.useFakeTimers({ doNotFake: ['nextTick'], now });

			await initBinaryDataManager();

			nock.disableNetConnect();
			mock = nock('https://bucket.s3.eu-central-1.amazonaws.com');
		});

		beforeEach(async () => {
			mock.get('/?location').reply(
				200,
				`<?xml version="1.0" encoding="UTF-8"?>
				<LocationConstraint>
					<LocationConstraint>eu-central-1</LocationConstraint>
				</LocationConstraint>`,
				{
					'content-type': 'application/xml',
				},
			);

			mock
				.put('/binary.json')
				.matchHeader(
					'X-Amz-Content-Sha256',
					'e43abcf3375244839c012f9633f95862d232a95b00d5bc7348b3098b9fed7f32',
				)
				.once()
				.reply(200, { success: true });
		});

		afterAll(() => {
			nock.restore();
		});

		testWorkflows(workflows);
	});
});
