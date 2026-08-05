import type { Mocked } from 'vitest';

import type { UrlService } from '@/services/url.service';

import type { TokenExchangeConfig } from '../../token-exchange.config';
import { InboundAudienceService } from '../inbound-audience.service';

describe('InboundAudienceService', () => {
	let config: TokenExchangeConfig;
	let urlService: Mocked<UrlService>;
	let service: InboundAudienceService;

	beforeEach(() => {
		config = { inboundAudience: '' } as TokenExchangeConfig;
		urlService = {
			getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.example.com'),
		} as unknown as Mocked<UrlService>;
		service = new InboundAudienceService(config, urlService);
	});

	it('returns the configured audience when set', () => {
		config.inboundAudience = 'https://configured-audience.example.com';

		expect(service.getExpectedAudience()).toBe('https://configured-audience.example.com');
		expect(urlService.getInstanceBaseUrl).not.toHaveBeenCalled();
	});

	it('falls back to the instance base URL when unset', () => {
		expect(service.getExpectedAudience()).toBe('https://n8n.example.com');
	});
});
