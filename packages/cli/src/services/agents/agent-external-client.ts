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

	try {
		const response = await fetch(config.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-n8n-api-key': config.apiKey,
			},
			body: JSON.stringify({ prompt: message }),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`External agent returned ${response.status}: ${await response.text()}`);
		}

		const data = (await response.json()) as {
			data?: { status: string; summary?: string; steps: TaskStep[] };
			status?: string;
			summary?: string;
			steps?: TaskStep[];
		};
		return (data.data ?? data) as { status: string; summary?: string; steps: TaskStep[] };
	} finally {
		clearTimeout(timeoutHandle);
	}
}
