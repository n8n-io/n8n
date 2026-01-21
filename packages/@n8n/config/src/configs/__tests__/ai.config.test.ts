import { Container } from '@n8n/di';
import { vi } from 'vitest';

import { AiConfig } from '../ai.config';

describe('AiConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
	});

	it('should not poison openAiDefaultHeaders object globally when modified', () => {
		const { openAiDefaultHeaders } = Container.get(AiConfig);
		openAiDefaultHeaders.test = 'ok';
		expect(openAiDefaultHeaders.test).toBe('ok');
		expect(Container.get(AiConfig).openAiDefaultHeaders.test).toBeFalsy();
	});
});
