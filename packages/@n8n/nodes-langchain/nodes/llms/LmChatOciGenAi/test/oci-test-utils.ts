import { OciGenAiGenericChat } from '@oracle/langchain-oci';
import { createResultOk } from '@n8n/utils/result';
import { lookup } from 'node:dns';
import { ConfigFileReader } from 'oci-common';
import type { NodeEgressFilter } from 'n8n-workflow';

import {
	createOciGenAiClient,
	validateOciCompartmentId,
	validateOciModelId,
	type OciGenAiCredentials,
} from '../../../../utils/ociGenAi';

export const runOciIntegrationTests = process.env.N8N_OCI_INTEGRATION_TESTS === '1';
export const OCI_INTEGRATION_REQUEST_TIMEOUT_MS = 45_000;
export const OCI_TIMEOUT_INTEGRATION_REQUEST_TIMEOUT_MS = 100;

// Mirrors n8n's no-policy egress filter so the live test exercises the same proxy transport path.
const passthroughEgressFilter: NodeEgressFilter = {
	validateUrl: async () => await Promise.resolve(createResultOk(undefined)),
	validateConnectionHost: () => createResultOk(undefined),
	createSecureLookup: () => lookup,
	validateRedirectSync: () => {},
};

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
	options: {
		egressFilter?: NodeEgressFilter;
		requestTimeout?: number;
	} = {},
): Promise<OciGenAiGenericChat> {
	return new OciGenAiGenericChat({
		client: await createOciGenAiClient(
			credentials,
			options.egressFilter,
			options.requestTimeout ?? OCI_INTEGRATION_REQUEST_TIMEOUT_MS,
		),
		compartmentId: validateOciCompartmentId(compartmentId),
		onDemandModelId: validateOciModelId(modelId),
		maxRetries: 0,
	});
}

/** Creates a model using n8n's egress-aware OCI transport with a short request timeout. */
export async function createOciTimeoutTestChatModel(
	credentials: OciGenAiCredentials,
	modelId: string,
	compartmentId: string,
): Promise<OciGenAiGenericChat> {
	return await createOciTestChatModel(credentials, modelId, compartmentId, {
		egressFilter: passthroughEgressFilter,
		requestTimeout: OCI_TIMEOUT_INTEGRATION_REQUEST_TIMEOUT_MS,
	});
}
