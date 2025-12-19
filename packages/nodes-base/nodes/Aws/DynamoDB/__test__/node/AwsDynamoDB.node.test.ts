import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../__tests__/credentials';

describe('AWS DynamoDB Node', () => {
	const dynamoDbNock = nock('https://dynamodb.eu-central-1.amazonaws.com');

	beforeAll(() => {
		dynamoDbNock
			.post('/', {
				TableName: 'n8n-testing',
				KeyConditionExpression: 'id = :idVal',
				ExpressionAttributeValues: {
					':idVal': { S: 'foo' },
				},
				ProjectionExpression: '#time',
				ExpressionAttributeNames: {
					'#time': 'timestamp',
				},
				Limit: 50,
				Select: 'SPECIFIC_ATTRIBUTES',
			})
			.reply(200, {
				Items: [
					{
						timestamp: { S: '2025-01-01' },
					},
				],
			});

		dynamoDbNock
			.post(
				'/',
				(body) =>
					body?.TableName === 'n8n-testing' &&
					body?.Key?.id?.S === 'foo' &&
					body?.Key?.timestamp?.S === '2025-01-01' &&
					body?.ExpressionAttributeNames?.['#time'] === 'timestamp' &&
					body?.ProjectionExpression === '#time',
			)
			.reply(200, {
				Item: {
					timestamp: { S: '2025-01-01' },
				},
			});

		dynamoDbNock
			.post(
				'/',
				(body) =>
					body?.TableName === 'n8n-testing' &&
					body?.Item?.id?.S === 'foo' &&
					body?.Item?.timestamp?.S === '2025-01-01' &&
					body?.Item?.data?.S === 'payload' &&
					body?.ConditionExpression === '#d = :v' &&
					body?.ExpressionAttributeNames?.['#d'] === 'data' &&
					body?.ExpressionAttributeValues?.[':v']?.S === 'lorem ipsum',
			)
			.reply(200, {});

		dynamoDbNock
			.post(
				'/',
				(body) =>
					body?.TableName === 'n8n-testing' &&
					body?.Key?.id?.S === 'foo' &&
					body?.Key?.timestamp?.S === '2025-01-01' &&
					body?.ConditionExpression === '#d = :v' &&
					body?.ExpressionAttributeNames?.['#d'] === 'data' &&
					body?.ExpressionAttributeValues?.[':v']?.S === 'payload',
			)
			.reply(200, {});
	});

	afterAll(() => dynamoDbNock.done());

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.json'],
	});
});
