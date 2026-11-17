import { HumanMessage } from '@langchain/core/messages';
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
	createOciTestChatModel,
	createOciTimeoutTestChatModel,
	getOciTestCompartmentId,
	getOciTestCredentials,
	getOciTestModelId,
	OCI_TIMEOUT_INTEGRATION_REQUEST_TIMEOUT_MS,
	runOciIntegrationTests,
} from './oci-test-utils';

const INVALID_MODEL_ID = 'n8n.integration-test-invalid-model';
// Signing and scheduling add fixed overhead, especially for intentionally tiny timeout values.
const OCI_DISCONNECTED_MAX_SETTLE_MS = Math.max(
	OCI_TIMEOUT_INTEGRATION_REQUEST_TIMEOUT_MS * 3,
	10_000,
);

async function run(): Promise<void> {
	const credentials = getOciTestCredentials();
	const model = getOciTestModelId();
	const compartmentId = getOciTestCompartmentId();
	const chatModel = await createOciTestChatModel(credentials, model, compartmentId);
	const response = await chatModel.invoke([
		new HumanMessage('Reply with exactly: OCI integration test passed'),
	]);

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
		async () => await chatModel.invoke([new HumanMessage('This request must fail')]),
		(error: unknown) => {
			assert.ok(error instanceof Error, 'OCI returned a non-Error rejection');
			assert.ok(error.message.trim(), 'OCI returned an empty error message');
			assert.doesNotMatch(
				`${error.name} ${error.message}`,
				/timeout|timed out/i,
				'OCI request timed out instead of rejecting the invalid model ID',
			);
			assert.notEqual(error.message, '[object Object]', 'OCI error details were not normalized');
			return true;
		},
	);
	console.log('[OCI INT TEST] Invalid OCI model rejection returned an actionable error.');
}

async function runDisconnectedTimeout(): Promise<void> {
	const credentials = getOciTestCredentials();
	const model = getOciTestModelId();
	const compartmentId = getOciTestCompartmentId();
	const chatModel = await createOciTimeoutTestChatModel(credentials, model, compartmentId);
	const startedAt = performance.now();

	await assert.rejects(
		async () => await chatModel.invoke([new HumanMessage('This request must not reach OCI')]),
		(error: unknown) => {
			assert.ok(error instanceof Error, 'OCI returned a non-Error rejection');
			assert.ok(error.message.trim(), 'OCI returned an empty network error message');
			return true;
		},
	);

	const elapsedMs = performance.now() - startedAt;
	assert.ok(
		elapsedMs <= OCI_DISCONNECTED_MAX_SETTLE_MS,
		`OCI request did not settle within the configured timeout window (${elapsedMs.toFixed(0)} ms)`,
	);
	console.log(`[OCI INT TEST] Disconnected OCI request settled after ${elapsedMs.toFixed(0)} ms.`);
}

describe.skipIf(!runOciIntegrationTests)('OCI Generative AI integration', () => {
	it('invokes the configured chat model', run, 60_000);
	it('returns an actionable error for an unavailable model', runInvalidModel, 60_000);
});

describe.skipIf(!runOciIntegrationTests)('OCI Generative AI disconnected integration', () => {
	it(
		'settles with a network error within the configured timeout window',
		runDisconnectedTimeout,
		OCI_DISCONNECTED_MAX_SETTLE_MS + 5_000,
	);
});
