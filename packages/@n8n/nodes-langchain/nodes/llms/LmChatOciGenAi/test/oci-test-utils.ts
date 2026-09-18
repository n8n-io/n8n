import { OciGenAiGenericChat } from '@oracle/langchain-oci';
import { ConfigFileReader } from 'oci-common';

import {
	createOciGenAiClient,
	validateOciCompartmentId,
	validateOciModelId,
	type OciGenAiCredentials,
} from '../../../../utils/ociGenAi';

export const runOciIntegrationTests = process.env.N8N_OCI_INTEGRATION_TESTS === '1';
export const OCI_INTEGRATION_REQUEST_TIMEOUT_MS = 45_000;

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing integration-test environment variable: ${name}`);
	}
	return value;
}

/** Loads the OCI profile used by optional live integration and socket diagnostics. */
export function getOciTestCredentials(): OciGenAiCredentials {
	const profile = process.env.OCI_CONFIG_PROFILE ?? 'DEFAULT';
	const config = ConfigFileReader.parseDefault(profile);
	const regionId = config.get('region');

	if (!regionId) {
		throw new Error(`OCI config profile "${profile}" does not define a region`);
	}

	return {
		authentication: 'session',
		configFilePath: ConfigFileReader.DEFAULT_FILE_PATH,
		configProfile: profile,
		regionId,
		serviceEndpoint: process.env.OCI_INFERENCE_ENDPOINT,
	};
}

export function getOciTestModelId(): string {
	return requiredEnv('OCI_GENAI_MODEL');
}

export function getOciTestCompartmentId(): string {
	return requiredEnv('OCI_GENAI_COMPARTMENT_OCID');
}

/** Creates the same OCI chat-model setup for both live test variants. */
export async function createOciTestChatModel(
	credentials: OciGenAiCredentials,
	modelId: string,
	compartmentId: string,
): Promise<OciGenAiGenericChat> {
	return new OciGenAiGenericChat({
		client: await createOciGenAiClient(credentials, undefined, OCI_INTEGRATION_REQUEST_TIMEOUT_MS),
		compartmentId: validateOciCompartmentId(compartmentId),
		onDemandModelId: validateOciModelId(modelId),
		maxRetries: 0,
	});
}
