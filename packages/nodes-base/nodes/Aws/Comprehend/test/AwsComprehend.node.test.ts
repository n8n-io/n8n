import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../__tests__/credentials';

describe('Test AWS Comprehend Node', () => {
	describe('Detect Language', () => {
		let mock: nock.Scope;
		const now = 1683028800000;
		const response = {
			Languages: [
				{
					LanguageCode: 'en',
					Score: 0.9774383902549744,
				},
				{
					LanguageCode: 'de',
					Score: 0.010717987082898617,
				},
			],
		};

		beforeAll(async () => {
			jest.useFakeTimers({ doNotFake: ['nextTick'], now });

			const baseUrl = 'https://comprehend.eu-central-1.amazonaws.com';

			mock = nock(baseUrl);
		});

		beforeEach(async () => {
			mock.post('/').reply(200, response);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
