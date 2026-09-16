import { OciGenAiGenericChat } from '@oracle/langchain-oci';
import { HumanMessage } from '@langchain/core/messages';
import assert from 'node:assert/strict';
import process from 'node:process';
import { ConfigFileReader } from 'oci-common';
import { describe, it } from 'vitest';

import {
	createOciGenAiClient,
	validateOciCompartmentId,
	validateOciModelId,
	type OciGenAiCredentials,
} from '../../../../utils/ociGenAi';

const runOciIntegrationTests = process.env.N8N_OCI_INTEGRATION_TESTS === '1';

function requiredEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing integration-test environment variable: ${name}`);
	}

	return value;
}

function getCredentials(): OciGenAiCredentials {
	const profile = process.env.OCI_CONFIG_PROFILE ?? 'DEFAULT';
	const config = ConfigFileReader.parseDefault(profile);
	const regionId = config.get('region');

	if (!regionId) {
		throw new Error(`OCI config profile "${profile}" does not define a region`);
	}

	return {
		// Let the OCI SDK load the default ~/.oci/config file, including its key path and passphrase.
		authentication: 'session',
		configFilePath: ConfigFileReader.DEFAULT_FILE_PATH,
		configProfile: profile,
		regionId,
		serviceEndpoint: process.env.OCI_INFERENCE_ENDPOINT,
	};
}

async function createChatModel(
	credentials: OciGenAiCredentials,
	modelId: string,
	compartmentId: string,
): Promise<OciGenAiGenericChat> {
	// Keep this standalone script independent of the node's workspace-only runtime imports.
	// supplyData() behavior is covered by the chat node's Vitest unit tests.
	return new OciGenAiGenericChat({
		client: await createOciGenAiClient(credentials),
		compartmentId: validateOciCompartmentId(compartmentId),
		onDemandModelId: validateOciModelId(modelId),
	});
}

async function run(): Promise<void> {
	const credentials = getCredentials();
	const model = requiredEnv('OCI_GENAI_MODEL');
	const compartmentId = requiredEnv('OCI_GENAI_COMPARTMENT_OCID');
	const chatModel = await createChatModel(credentials, model, compartmentId);
	const response = await chatModel.invoke([
		new HumanMessage('Reply with exactly: OCI integration test passed'),
	]);

	assert.ok(response.content, 'The OCI chat model returned empty content');
	console.log('[OCI INT TEST] OCI chat integration passed.');
}

describe.skipIf(!runOciIntegrationTests)('OCI Generative AI integration', () => {
	it('invokes the configured chat model', run, 60_000);
});
