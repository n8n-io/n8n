import { Container } from '@n8n/di';

import { AiConfig } from '../ai.config';

describe('AiConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	it('should not poison openAiDefaultHeaders object globally when modified', () => {
		const { openAiDefaultHeaders } = Container.get(AiConfig);
		openAiDefaultHeaders.test = 'ok';
		expect(openAiDefaultHeaders.test).toBe('ok');
		expect(Container.get(AiConfig).openAiDefaultHeaders.test).toBeFalsy();
	});

	it('leaves the model stream stall deadlines unset by default so the agent runtime defaults apply', () => {
		const config = Container.get(AiConfig);
		expect(config.modelStreamIdleTimeoutMs).toBeUndefined();
		expect(config.modelStreamFirstOutputTimeoutMs).toBeUndefined();
	});

	it('reads the model stream stall deadlines from the environment', () => {
		vi.stubEnv('N8N_AI_MODEL_STREAM_IDLE_TIMEOUT_MS', '300000');
		vi.stubEnv('N8N_AI_MODEL_STREAM_FIRST_OUTPUT_TIMEOUT_MS', '600000');
		const config = Container.get(AiConfig);
		expect(config.modelStreamIdleTimeoutMs).toBe(300_000);
		expect(config.modelStreamFirstOutputTimeoutMs).toBe(600_000);
	});
});
