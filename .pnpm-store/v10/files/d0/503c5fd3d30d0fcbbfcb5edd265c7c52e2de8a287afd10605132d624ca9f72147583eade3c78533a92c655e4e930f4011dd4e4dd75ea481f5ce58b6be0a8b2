import { it, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AiAssistantClient } from '../src/index.ts';
import { faker } from '@faker-js/faker';
import nock from 'nock';
import {
	ASK_AI_PAYLOAD,
	INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD,
	BUILDER_API_PROXY_TOKEN_PAYLOAD,
	BUILDER_INSTANCE_CREDITS_PAYLOAD,
} from './testData.ts';

const BASE_URL = 'https://ai-assistant.n8n.io';
const LICENSE_CERT = 'test';
const N8N_VERSION = '1.0.0';
const USER_ID = '1';
const CONSUMER_ID = 'test';

const INSTANCE_ID = 'test-instance-id';

const client = new AiAssistantClient({
	licenseCert: LICENSE_CERT,
	consumerId: CONSUMER_ID,
	n8nVersion: N8N_VERSION,
	instanceId: INSTANCE_ID,
	baseUrl: BASE_URL,
});

const accessToken = faker.string.uuid();

describe('AiAssistantClient', () => {
	afterEach(() => {
		nock.cleanAll();
	});

	beforeEach(() => {
		if (!nock.isActive()) nock.activate();
	});

	it('Should call POST /auth/token on first request', async () => {
		// Arrange

		let newTokenRequestBody: any;

		const newTokenRequest = nock(BASE_URL)
			.post('/auth/token')
			.reply(function (_, requestBody) {
				newTokenRequestBody = requestBody;
				return [
					200,
					{
						accessToken,
						tokenType: 'Bearer',
					},
				];
			});

		nock(BASE_URL)
			.post('/v1/chat')
			.reply(200, {
				body: {
					sessionId: faker.string.uuid(),
					messages: [],
				},
			});

		// Act
		const response = await client.chat(INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD, { id: USER_ID });

		// Assert
		assert.ok(newTokenRequest.isDone());
		assert.ok(response.body instanceof ReadableStream);
		assert.ok('licenseCert' in newTokenRequestBody);
		assert.ok(newTokenRequestBody.licenseCert === LICENSE_CERT);
	});

	it('Should call POST /v1/chat after POST /auth/token with valid parameters', async () => {
		// Arrange

		let chatRequestBody: any;
		let askAiRequestHeaders: any;

		nock(BASE_URL)
			.post('/auth/token')
			.once()
			.reply(function () {
				return [
					200,
					{
						accessToken,
						tokenType: 'Bearer',
					},
				];
			});

		const chatRequest = nock(BASE_URL)
			.post('/v1/chat')
			.once()
			.reply(function (_, requestBody) {
				askAiRequestHeaders = this.req.getHeaders();
				chatRequestBody = requestBody;
				return [
					200,
					{
						sessionId: faker.string.uuid(),
						messages: [],
					},
				];
			});

		// Act
		const response = await client.chat(INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD, { id: USER_ID });

		// Assert
		assert.ok(chatRequest.isDone());
		assert.ok(response.body instanceof ReadableStream);
		assert.deepStrictEqual(chatRequestBody, INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD);
		assert.ok('authorization' in askAiRequestHeaders);
		assert.ok('x-consumer-id' in askAiRequestHeaders);
		assert.ok('x-n8n-version' in askAiRequestHeaders);
		assert.ok('x-sdk-version' in askAiRequestHeaders);
		assert.ok('x-user-id' in askAiRequestHeaders);
		assert.ok(askAiRequestHeaders.authorization === `Bearer ${accessToken}`);
		assert.ok(askAiRequestHeaders['x-n8n-version'] === N8N_VERSION);
		assert.ok(askAiRequestHeaders['x-user-id'] === USER_ID);
		assert.ok(askAiRequestHeaders['x-consumer-id'] === CONSUMER_ID);
	});

	it('Should call POST /auth/token when token is expired', async () => {
		// Arrange

		let chatRequestBody: any;
		let askAiRequestHeaders: any;

		nock(BASE_URL)
			.post('/auth/token')
			.once()
			.reply(function () {
				return [
					200,
					{
						accessToken,
						tokenType: 'Bearer',
					},
				];
			});

		nock(BASE_URL)
			.post('/v1/chat')
			.twice()
			.reply(function (_, requestBody) {
				askAiRequestHeaders = this.req.getHeaders();
				chatRequestBody = requestBody;
				return [
					200,
					{
						sessionId: faker.string.uuid(),
						messages: [],
					},
				];
			});

		// Act
		await client.chat(INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD, { id: USER_ID });

		nock(BASE_URL)
			.post('/auth/token')
			.once()
			.reply(function () {
				return [401];
			});

		const response = await client.chat(INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD, { id: USER_ID });

		// Assert
		assert.ok(response.body instanceof ReadableStream);
		assert.deepStrictEqual(chatRequestBody, INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD);
		assert.ok('authorization' in askAiRequestHeaders);
		assert.ok('x-consumer-id' in askAiRequestHeaders);
		assert.ok('x-n8n-version' in askAiRequestHeaders);
		assert.ok('x-sdk-version' in askAiRequestHeaders);
		assert.ok('x-user-id' in askAiRequestHeaders);
		assert.ok(askAiRequestHeaders.authorization === `Bearer ${accessToken}`);
		assert.ok(askAiRequestHeaders['x-n8n-version'] === N8N_VERSION);
		assert.ok(askAiRequestHeaders['x-user-id'] === USER_ID);
		assert.ok(askAiRequestHeaders['x-consumer-id'] === CONSUMER_ID);
	});

	it('Should call POST /v1/ask-ai after POST /auth/token with valid parameters', async () => {
		// Arrange

		let askAiRequestBody: any;
		let askAiRequestHeaders: any;

		const code = "console.log('Hello, World!');";

		nock(BASE_URL)
			.post('/auth/token')
			.once()
			.reply(function () {
				return [
					200,
					{
						accessToken,
						tokenType: 'Bearer',
					},
				];
			});

		const chatRequest = nock(BASE_URL)
			.post('/v1/ask-ai')
			.once()
			.reply(function (_, requestBody) {
				askAiRequestHeaders = this.req.getHeaders();
				askAiRequestBody = requestBody;
				return [
					200,
					{
						code,
					},
				];
			});

		// Act

		const response = await client.askAi(ASK_AI_PAYLOAD, { id: USER_ID });

		// Assert
		assert.ok(chatRequest.isDone());
		assert.deepStrictEqual(askAiRequestBody, ASK_AI_PAYLOAD);
		assert.ok('authorization' in askAiRequestHeaders);
		assert.ok('x-consumer-id' in askAiRequestHeaders);
		assert.ok('x-n8n-version' in askAiRequestHeaders);
		assert.ok('x-sdk-version' in askAiRequestHeaders);
		assert.ok('x-user-id' in askAiRequestHeaders);
		assert.ok(askAiRequestHeaders.authorization === `Bearer ${accessToken}`);
		assert.ok(askAiRequestHeaders['x-n8n-version'] === N8N_VERSION);
		assert.ok(askAiRequestHeaders['x-user-id'] === USER_ID);
		assert.ok(askAiRequestHeaders['x-consumer-id'] === CONSUMER_ID);
		assert.ok(response.code === code);
	});

	it('Should throw InternalServerError when /ask-ai API returns error response', async () => {
		nock(BASE_URL)
			.post('/auth/token')
			.once()
			.reply(function () {
				return [
					200,
					{
						accessToken,
						tokenType: 'Bearer',
					},
				];
			});

		nock(BASE_URL)
			.post('/v1/ask-ai')
			.once()
			.reply(function () {
				return [500, {}];
			});

		assert.rejects(
			client.askAi(ASK_AI_PAYLOAD, { id: USER_ID }),
			new RegExp('AIServiceAPIResponseError: Internal Server Error'),
		);
	});

	it('Should throw AuthError when cannot auth to call /ask-ai', async () => {
		nock(BASE_URL)
			.post('/auth/token')
			.once()
			.reply(function () {
				return [
					500,
					{
						message: 'test',
					},
				];
			});

		nock(BASE_URL)
			.post('/v1/ask-ai')
			.once()
			.reply(function () {
				return [200, {}];
			});

		assert.rejects(
			client.askAi(ASK_AI_PAYLOAD, { id: USER_ID }),
			new RegExp('AIServiceAPIResponseError: Invalid response from assistant service'),
		);
	});

	it('Should include API error message when auth token retrieval fails', async () => {
		// Arrange
		const testClient = new AiAssistantClient({
			licenseCert: 'invalid-license',
			consumerId: CONSUMER_ID,
			n8nVersion: N8N_VERSION,
			instanceId: INSTANCE_ID,
			baseUrl: BASE_URL,
		});

		nock(BASE_URL).post('/auth/token').once().reply(401, {
			message: 'Invalid license',
			error: 'Unauthorized',
			statusCode: 401,
		});

		// Act & Assert
		await assert.rejects(testClient.askAi(ASK_AI_PAYLOAD, { id: USER_ID }), (error: Error) => {
			assert.ok(error.message.includes('Could not retrieve access token'));
			assert.ok(error.message.includes('Invalid license'));
			return true;
		});
	});

	it('generateAiCreditsCredentials should call POST /ai-credits/credentials', async () => {
		// Arrange

		let aiCreditCredentialsRequestBody: any;

		const aiCreditCredentialsRequest = nock(BASE_URL)
			.post('/v1/ai-credits/credentials')
			.reply(function (_, requestBody) {
				aiCreditCredentialsRequestBody = requestBody;
				return [
					200,
					{
						apiKey: faker.string.uuid(),
						url: faker.internet.url(),
					},
				];
			});

		// Act
		await client.generateAiCreditsCredentials({ id: USER_ID });

		// Assert
		assert.ok(aiCreditCredentialsRequest.isDone());
		assert.ok('licenseCert' in aiCreditCredentialsRequestBody);
	});

	it('getBuilderApiProxyToken should call POST /builder/api-proxy-token', async () => {
		// Arrange
		const expectedAccessToken = faker.string.uuid();
		const expectedTokenType = 'Bearer';
		let builderTokenRequestBody: any;
		let builderTokenRequestHeaders: any;

		const builderTokenRequest = nock(BASE_URL)
			.post('/v1/builder/api-proxy-token')
			.reply(function (_, requestBody) {
				builderTokenRequestBody = requestBody;
				builderTokenRequestHeaders = this.req.getHeaders();
				return [
					200,
					{
						accessToken: expectedAccessToken,
						tokenType: expectedTokenType,
					},
				];
			});

		// Act
		const response = await client.getBuilderApiProxyToken({ id: USER_ID });

		// Assert
		assert.ok(builderTokenRequest.isDone());
		assert.ok('licenseCert' in builderTokenRequestBody);
		assert.strictEqual(builderTokenRequestBody.licenseCert, LICENSE_CERT);
		assert.ok('x-consumer-id' in builderTokenRequestHeaders);
		assert.ok('x-user-id' in builderTokenRequestHeaders);
		assert.ok('x-n8n-version' in builderTokenRequestHeaders);
		assert.ok('x-sdk-version' in builderTokenRequestHeaders);
		assert.strictEqual(builderTokenRequestHeaders['x-user-id'], USER_ID);
		assert.strictEqual(builderTokenRequestHeaders['x-consumer-id'], CONSUMER_ID);
		assert.strictEqual(builderTokenRequestHeaders['x-n8n-version'], N8N_VERSION);
		assert.strictEqual(response.accessToken, expectedAccessToken);
		assert.strictEqual(response.tokenType, expectedTokenType);
	});

	it('getBuilderApiProxyToken should handle errors properly', async () => {
		// Arrange
		nock(BASE_URL).post('/v1/builder/api-proxy-token').reply(400, {
			message: 'Invalid license: Missing required feature',
		});

		// Act & Assert
		await assert.rejects(
			client.getBuilderApiProxyToken({ id: USER_ID }),
			new RegExp('AIServiceAPIResponseError: Invalid license: Missing required feature'),
		);
	});

	it('getBuilderApiProxyToken should include userMessageId when provided', async () => {
		// Arrange
		const expectedAccessToken = faker.string.uuid();
		const expectedTokenType = 'Bearer';
		const userMessageId = 'msg-123';
		let builderTokenRequestBody: Record<string, unknown>;

		const builderTokenRequest = nock(BASE_URL)
			.post('/v1/builder/api-proxy-token')
			.reply(function (_, requestBody) {
				builderTokenRequestBody = requestBody as Record<string, unknown>;
				return [
					200,
					{
						accessToken: expectedAccessToken,
						tokenType: expectedTokenType,
					},
				];
			});

		// Act
		const response = await client.getBuilderApiProxyToken({ id: USER_ID }, { userMessageId });

		// Assert
		assert.ok(builderTokenRequest.isDone());
		assert.strictEqual(builderTokenRequestBody.licenseCert, LICENSE_CERT);
		assert.strictEqual(builderTokenRequestBody.userMessageId, userMessageId);
		assert.strictEqual(response.accessToken, expectedAccessToken);
		assert.strictEqual(response.tokenType, expectedTokenType);
	});

	it('markBuilderSuccess should call POST /builder/success and return credits info', async () => {
		// Arrange
		const authToken = 'Bearer test-auth-token-123';
		const expectedCreditsQuota = 100;
		const expectedCreditsClaimed = 26;
		let successRequestHeaders: any;
		let successRequestBody: any;

		const successRequest = nock(BASE_URL)
			.post('/v1/builder/success')
			.reply(function (_, requestBody) {
				successRequestHeaders = this.req.getHeaders();
				successRequestBody = requestBody;
				return [
					200,
					{
						creditsQuota: expectedCreditsQuota,
						creditsClaimed: expectedCreditsClaimed,
					},
				];
			});

		// Act
		const response = await client.markBuilderSuccess({ id: USER_ID }, { Authorization: authToken });

		// Assert
		assert.ok(successRequest.isDone());
		assert.ok('licenseCert' in successRequestBody);
		assert.strictEqual(successRequestBody.licenseCert, LICENSE_CERT);
		assert.ok('x-authorization' in successRequestHeaders);
		assert.ok('x-consumer-id' in successRequestHeaders);
		assert.ok('x-user-id' in successRequestHeaders);
		assert.ok('x-n8n-version' in successRequestHeaders);
		assert.ok('x-sdk-version' in successRequestHeaders);
		assert.strictEqual(successRequestHeaders['x-authorization'], authToken);
		assert.strictEqual(successRequestHeaders['x-user-id'], USER_ID);
		assert.strictEqual(successRequestHeaders['x-consumer-id'], CONSUMER_ID);
		assert.strictEqual(successRequestHeaders['x-n8n-version'], N8N_VERSION);
		assert.strictEqual(response.creditsQuota, expectedCreditsQuota);
		assert.strictEqual(response.creditsClaimed, expectedCreditsClaimed);
	});

	it('markBuilderSuccess should handle errors properly', async () => {
		// Arrange
		const authToken = 'Bearer test-auth-token-123';
		nock(BASE_URL).post('/v1/builder/success').reply(400, {
			message: 'Invalid access token',
		});

		// Act & Assert
		await assert.rejects(
			client.markBuilderSuccess({ id: USER_ID }, { Authorization: authToken }),
			new RegExp('AIServiceAPIResponseError: Invalid access token'),
		);
	});

	it('getBuilderInstanceCredits should call POST /builder/usage', async () => {
		// Arrange
		const expectedCreditsQuota = 100;
		const expectedCreditsClaimed = 25;
		let instanceCreditsRequestBody: any;
		let instanceCreditsRequestHeaders: any;

		const instanceCreditsRequest = nock(BASE_URL)
			.post('/v1/builder/usage')
			.reply(function (_, requestBody) {
				instanceCreditsRequestBody = requestBody;
				instanceCreditsRequestHeaders = this.req.getHeaders();
				return [
					200,
					{
						creditsQuota: expectedCreditsQuota,
						creditsClaimed: expectedCreditsClaimed,
					},
				];
			});

		// Act
		const response = await client.getBuilderInstanceCredits({ id: USER_ID });

		// Assert
		assert.ok(instanceCreditsRequest.isDone());
		assert.ok('licenseCert' in instanceCreditsRequestBody);
		assert.strictEqual(instanceCreditsRequestBody.licenseCert, LICENSE_CERT);
		assert.ok('x-consumer-id' in instanceCreditsRequestHeaders);
		assert.ok('x-user-id' in instanceCreditsRequestHeaders);
		assert.ok('x-n8n-version' in instanceCreditsRequestHeaders);
		assert.ok('x-sdk-version' in instanceCreditsRequestHeaders);
		assert.strictEqual(instanceCreditsRequestHeaders['x-user-id'], USER_ID);
		assert.strictEqual(instanceCreditsRequestHeaders['x-consumer-id'], CONSUMER_ID);
		assert.strictEqual(instanceCreditsRequestHeaders['x-n8n-version'], N8N_VERSION);
		assert.strictEqual(response.creditsQuota, expectedCreditsQuota);
		assert.strictEqual(response.creditsClaimed, expectedCreditsClaimed);
	});

	it('getBuilderInstanceCredits should return zero claimed credits for new instance', async () => {
		// Arrange
		const expectedCreditsQuota = 50;
		const expectedCreditsClaimed = 0;

		nock(BASE_URL).post('/v1/builder/usage').reply(200, {
			creditsQuota: expectedCreditsQuota,
			creditsClaimed: expectedCreditsClaimed,
		});

		// Act
		const response = await client.getBuilderInstanceCredits({ id: USER_ID });

		// Assert
		assert.strictEqual(response.creditsQuota, expectedCreditsQuota);
		assert.strictEqual(response.creditsClaimed, expectedCreditsClaimed);
	});

	it('getBuilderInstanceCredits should handle errors properly', async () => {
		// Arrange
		nock(BASE_URL).post('/v1/builder/usage').reply(401, {
			message: 'License does not have builder enabled',
		});

		// Act & Assert
		await assert.rejects(
			client.getBuilderInstanceCredits({ id: USER_ID }),
			new RegExp('AIServiceAPIResponseError: License does not have builder enabled'),
		);
	});

	it('getBuilderInstanceCredits should handle invalid license format', async () => {
		// Arrange
		nock(BASE_URL).post('/v1/builder/usage').reply(401, {
			message: 'Invalid license. Unable to parse license.',
		});

		// Act & Assert
		await assert.rejects(
			client.getBuilderInstanceCredits({ id: USER_ID }),
			new RegExp('AIServiceAPIResponseError: Invalid license. Unable to parse license.'),
		);
	});

	it('getBuilderInstanceCredits should handle missing quota error', async () => {
		// Arrange
		nock(BASE_URL).post('/v1/builder/usage').reply(401, {
			message: 'No builder credits quota allotted',
		});

		// Act & Assert
		await assert.rejects(
			client.getBuilderInstanceCredits({ id: USER_ID }),
			new RegExp('AIServiceAPIResponseError: No builder credits quota allotted'),
		);
	});

	it('getBuilderInstanceCredits should handle invalid response format', async () => {
		// Arrange
		nock(BASE_URL).post('/v1/builder/usage').reply(200, {
			wrongField: 'invalid',
		});

		// Act & Assert
		await assert.rejects(
			client.getBuilderInstanceCredits({ id: USER_ID }),
			new RegExp('AIServiceAPIResponseError: Invalid response from assistant service'),
		);
	});

	it('updateLicenseCert should update the license and clear the active token', async () => {
		// Arrange
		const newLicenseCert = 'new-license-cert';
		const newAccessToken = faker.string.uuid();
		const testClient = new AiAssistantClient({
			licenseCert: LICENSE_CERT,
			consumerId: CONSUMER_ID,
			n8nVersion: N8N_VERSION,
			instanceId: INSTANCE_ID,
			baseUrl: BASE_URL,
		});

		// First request to establish an active token
		nock(BASE_URL).post('/auth/token').once().reply(200, {
			accessToken,
			tokenType: 'Bearer',
		});

		nock(BASE_URL).post('/v1/chat').once().reply(200, {
			sessionId: faker.string.uuid(),
			messages: [],
		});

		await testClient.chat(INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD, { id: USER_ID });

		// Act - Update license cert
		testClient.updateLicenseCert(newLicenseCert);

		// Assert - Should fetch a new token with the new license on next request
		let tokenRequestBody: Record<string, unknown> = {};

		nock(BASE_URL)
			.post('/auth/token')
			.once()
			.reply(function (_, requestBody) {
				tokenRequestBody = requestBody as Record<string, unknown>;
				return [
					200,
					{
						accessToken: newAccessToken,
						tokenType: 'Bearer',
					},
				];
			});

		nock(BASE_URL).post('/v1/chat').once().reply(200, {
			sessionId: faker.string.uuid(),
			messages: [],
		});

		await testClient.chat(INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD, { id: USER_ID });

		// Verify the new license cert was used in the token request
		assert.strictEqual(tokenRequestBody.licenseCert, newLicenseCert);
	});
});
