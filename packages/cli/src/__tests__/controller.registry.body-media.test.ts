import type { GlobalConfig } from '@n8n/config';
import { Body, ControllerRegistryMetadata, Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import express from 'express';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { ControllerRegistry } from '@/controller.registry';
import type { License } from '@/license';
import type { LastActiveAtService } from '@/services/last-active-at.service';
import { RateLimitService } from '@/services/rate-limit.service';

/**
 * Guard test suite ensuring Internal API controllers cannot declare a multipart `@Body`.
 * This is only supported for Public API controllers. We may change that in future.
 */
describe('ControllerRegistry - @Body media guard', () => {
	const authService = mock<AuthService>();
	const lastActiveAtService = mock<LastActiveAtService>();

	function activate(): void {
		authService.createAuthMiddleware.mockImplementation(() => async (_req, _res, next) => next());
		lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());

		new ControllerRegistry(
			mock<License>(),
			authService,
			mock<GlobalConfig>({ endpoints: { rest: 'rest' } }),
			Container.get(ControllerRegistryMetadata),
			lastActiveAtService,
			new RateLimitService(),
		).activate(express());
	}

	beforeEach(() => {
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
	});

	it('throws for an internal route declaring a multipart @Body', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Post('/')
			method(@Body({ mediaType: 'multipart/form-data', uploadLimits: () => ({}) }) _body: unknown) {
				return {};
			}
		}

		expect(() => activate()).toThrow(
			"TestController.method declares @Body({ mediaType: 'multipart/form-data' }), which only " +
				'@PublicApiController routes support.',
		);
	});
});
