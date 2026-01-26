import { Container } from '@n8n/di';

import { AiConfig } from '../ai.config';

describe('AiConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	it('should not poison openAiDefaultHeaders object globally when modified', () => {
		const { openAiDefaultHeaders } = Container.get(AiConfig);
		openAiDefaultHeaders.test = 'ok';
		expect(openAiDefaultHeaders.test).toBe('ok');
		expect(Container.get(AiConfig).openAiDefaultHeaders.test).toBeFalsy();
	});
});
