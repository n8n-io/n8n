import {
	classifyEndpoint,
	buildRequestBody,
	buildRequestHeaders,
	a2aResponseToInternal,
} from '@/agents/a2a-adapter';
import { validateExternalAgentUrl } from '@/agents/validate-agent-url';

import type { ExternalAgentConfig, TaskStep } from './agents.types';
import { EXTERNAL_AGENT_TIMEOUT_MS } from './agents.types';

export async function callExternalAgent(
	config: ExternalAgentConfig,
	message: string,
): Promise<{ status: string; summary?: string; steps: TaskStep[] }> {
	await validateExternalAgentUrl(config.url);

	const controller = new AbortController();
	const timeoutHandle = setTimeout(() => controller.abort(), EXTERNAL_AGENT_TIMEOUT_MS);

	const endpointType = classifyEndpoint(config.url);
	const headers = buildRequestHeaders(endpointType, config.apiKey);
	const body = buildRequestBody(endpointType, message);

	try {
		const response = await fetch(config.url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`External agent returned ${response.status}: ${await response.text()}`);
		}

		const data = (await response.json()) as Record<string, unknown>;

		// Translate A2A responses to internal format
		if (endpointType !== 'n8n') {
			const translated = a2aResponseToInternal(data);
			return {
				status: (translated.status as string) ?? 'completed',
				summary: translated.summary as string | undefined,
				steps: (translated.steps as TaskStep[]) ?? [],
			};
		}

		// n8n format — extract from envelope
		const n8nData = (data.data ?? data) as {
			status?: string;
			summary?: string;
			steps?: TaskStep[];
		};
		return {
			status: n8nData.status ?? 'completed',
			summary: n8nData.summary,
			steps: n8nData.steps ?? [],
		};
	} finally {
		clearTimeout(timeoutHandle);
	}
}
