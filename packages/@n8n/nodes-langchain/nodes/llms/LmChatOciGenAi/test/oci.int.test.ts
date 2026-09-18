import { HumanMessage } from '@langchain/core/messages';
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { awaitOciGenAiRequest } from '../../../../utils/ociGenAi';

import {
	OCI_INTEGRATION_REQUEST_TIMEOUT_MS,
	createOciTestChatModel,
	getOciTestCompartmentId,
	getOciTestCredentials,
	getOciTestModelId,
	runOciIntegrationTests,
} from './oci-test-utils';

const INVALID_MODEL_ID = 'n8n.integration-test-invalid-model';

async function run(): Promise<void> {
	const credentials = getOciTestCredentials();
	const model = getOciTestModelId();
	const compartmentId = getOciTestCompartmentId();
	const chatModel = await createOciTestChatModel(credentials, model, compartmentId);
	const response = await awaitOciGenAiRequest(
		chatModel.invoke([new HumanMessage('Reply with exactly: OCI integration test passed')]),
		OCI_INTEGRATION_REQUEST_TIMEOUT_MS,
	);

	assert.ok(
		typeof response.content === 'string' ? response.content.trim() : response.content.length > 0,
		'The OCI chat model returned empty content',
	);
	console.log('[OCI INT TEST] OCI chat integration passed.');
}

async function runInvalidModel(): Promise<void> {
	const credentials = getOciTestCredentials();
	const compartmentId = getOciTestCompartmentId();
	const chatModel = await createOciTestChatModel(credentials, INVALID_MODEL_ID, compartmentId);

	await assert.rejects(
		async () => {
			await awaitOciGenAiRequest(
				chatModel.invoke([new HumanMessage('This request must fail')]),
				OCI_INTEGRATION_REQUEST_TIMEOUT_MS,
			);
		},
		(error: unknown) => {
			assert.ok(error instanceof Error, 'OCI returned a non-Error rejection');
			assert.ok(error.message.trim(), 'OCI returned an empty error message');
			assert.notEqual(error.message, '[object Object]', 'OCI error details were not normalized');
			return true;
		},
	);
	console.log('[OCI INT TEST] Invalid OCI model rejection returned an actionable error.');
}

describe.skipIf(!runOciIntegrationTests)('OCI Generative AI integration', () => {
	it('invokes the configured chat model', run, 60_000);
	it('returns an actionable error for an unavailable model', runInvalidModel, 60_000);
});
