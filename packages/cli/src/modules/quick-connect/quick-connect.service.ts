import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';

import { IQuickConnectHandler } from './handlers/handler.interface';
import { QuickConnectConfig } from './quick-connect.config';
import { QuickConnectError } from './quick-connect.errors';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const backendHandlers = {
	firecrawl: async () => (await import('./handlers/firecrawl.handler')).FirecrawlHandler,
};

@Service()
export class QuickConnectService {
	private readonly handlers = new Map<string, IQuickConnectHandler>();

	constructor(
		private readonly logger: Logger,
		private readonly quickConnectConfig: QuickConnectConfig,
	) {
		this.logger = this.logger.scoped('quick-connect');
	}

	async getApiKey(quickConnectType: string, user: User) {
		const handler = this.handlers.get(quickConnectType);
		if (!handler) {
			throw new BadRequestError(`Quick connect handler not configured for: ${quickConnectType}`);
		}

		try {
			return await handler.getApiKey(user);
		} catch (error) {
			this.logger.error('Failed to fetch credential data from third-party', {
				error,
				quickConnectType,
			});
			throw new QuickConnectError(
				'Failed to connect to external service. Please try again later.',
				quickConnectType,
				error instanceof Error ? error : undefined,
			);
		}
	}

	async registerHandlers() {
		for (const option of this.quickConnectConfig.options) {
			const { quickConnectType } = option;
			if (quickConnectType in backendHandlers) {
				const Handler = await backendHandlers[quickConnectType as keyof typeof backendHandlers]();
				const handler = Container.get(Handler);
				// @ts-expect-error the configuration option type is not reduced to specific subtype
				handler.setConfig(option);
				this.handlers.set(quickConnectType, handler);
			}
		}
	}
}
