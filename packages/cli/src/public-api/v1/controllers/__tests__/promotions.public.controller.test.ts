import {
	ListPromotionRepositoriesQueryDto,
	type ApplyPackageDto,
	type ApplySelectionDto,
	type ContinueApplyPackageDto,
	type ContinueApplySelectionDto,
	type CreatePromotionEnvironmentDto,
	type CreatePromotionProviderDto,
	type UpdatePromotionEnvironmentDto,
	type UpdatePromotionProviderDto,
	type PromotionInstanceApplyPreviewDto,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@n8n/errors';
import { PromotionChangeService } from '@/modules/promotions.ee/promotion-change.service';
import { PromotionEnvironmentsService } from '@/modules/promotions.ee/promotion-environments.service';
import { PromotionProvidersService } from '@/modules/promotions.ee/promotion-providers.service';
import { PromotionsService } from '@/modules/promotions.ee/promotions.service';
import type { PublicApiRequest } from '@/public-api/public-api-client';

import { PromotionsPublicController } from '../promotions.public.controller';

describe('Promotion discovery cursor validation', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const controller = new PromotionsPublicController(moduleRegistry);
	const request = mock<AuthenticatedRequest>();
	const response = mock<Response>();

	async function rejectsCursor(cursor: string) {
		await expect(
			controller.getPromotionProviderRepositories(
				request,
				response,
				'not-needed',
				ListPromotionRepositoriesQueryDto.parse({ cursor }),
			),
			cursor,
		).rejects.toThrow(BadRequestError);
		expect(moduleRegistry.isActive).not.toHaveBeenCalled();
	}

	it('rejects undecodable and non-offset cursors before accessing the module', async () => {
		await rejectsCursor('not-a-cursor');
		await rejectsCursor(Buffer.from(JSON.stringify({ lastId: '42', limit: 2 })).toString('base64'));
	});

	it('rejects invalid page bounds and offsets that do not start a page', async () => {
		for (const cursor of [
			{ offset: -1, limit: 2 },
			{ offset: 1, limit: 2 },
			{ offset: 0, limit: 101 },
			{ offset: 0, limit: -2 },
			{ offset: 0, limit: '2' },
			{ offset: 1.5, limit: 2 },
		]) {
			await rejectsCursor(Buffer.from(JSON.stringify(cursor)).toString('base64'));
		}
	});
});

describe('Promotion operation context', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const providersService = mockInstance(PromotionProvidersService);
	const environmentsService = mockInstance(PromotionEnvironmentsService);
	const promotionsService = mockInstance(PromotionsService);
	const controller = new PromotionsPublicController(moduleRegistry);
	const response = mock<Response>();
	const ctx: OperationContext = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };

	beforeEach(() => {
		vi.clearAllMocks();
		moduleRegistry.isActive.mockReturnValue(true);
	});

	type Route = {
		route: string;
		call: (req: PublicApiRequest) => Promise<unknown>;
		ctxPassed: () => OperationContext | undefined;
	};

	const routes: Route[] = [
		{
			route: 'createPromotionProvider',
			call: async (req) =>
				await controller.createPromotionProvider(req, response, {} as CreatePromotionProviderDto),
			ctxPassed: () => providersService.create.mock.calls[0][2],
		},
		{
			route: 'updatePromotionProvider',
			call: async (req) =>
				await controller.updatePromotionProvider(
					req,
					response,
					'provider-1',
					{} as UpdatePromotionProviderDto,
				),
			ctxPassed: () => providersService.update.mock.calls[0][3],
		},
		{
			route: 'deletePromotionProvider',
			call: async (req) => await controller.deletePromotionProvider(req, response, 'provider-1'),
			ctxPassed: () => providersService.delete.mock.calls[0][2],
		},
		{
			route: 'createPromotionEnvironment',
			call: async (req) =>
				await controller.createPromotionEnvironment(
					req,
					response,
					{} as CreatePromotionEnvironmentDto,
				),
			ctxPassed: () => environmentsService.create.mock.calls[0][2],
		},
		{
			route: 'updatePromotionEnvironment',
			call: async (req) =>
				await controller.updatePromotionEnvironment(
					req,
					response,
					'environment-1',
					{} as UpdatePromotionEnvironmentDto,
				),
			ctxPassed: () => environmentsService.update.mock.calls[0][3],
		},
		{
			route: 'deletePromotionEnvironment',
			call: async (req) =>
				await controller.deletePromotionEnvironment(req, response, 'environment-1'),
			ctxPassed: () => environmentsService.delete.mock.calls[0][2],
		},
		{
			route: 'applyPackage',
			call: async (req) =>
				await controller.applyPackage(req, response, 'environment-1', {} as ApplyPackageDto),
			ctxPassed: () => promotionsService.apply.mock.calls[0][4],
		},
		{
			route: 'continueApplyPackage',
			call: async (req) =>
				await controller.continueApplyPackage(
					req,
					response,
					'environment-1',
					{} as ContinueApplyPackageDto,
				),
			ctxPassed: () => promotionsService.continueApply.mock.calls[0][4],
		},
		{
			route: 'applyProjectSelection',
			call: async (req) =>
				await controller.applyProjectSelection(req, response, 'project-1', {} as ApplySelectionDto),
			ctxPassed: () => promotionsService.applyProjectSelection.mock.calls[0][4],
		},
		{
			route: 'continueApplyProjectSelection',
			call: async (req) =>
				await controller.continueApplyProjectSelection(
					req,
					response,
					'project-1',
					{} as ContinueApplySelectionDto,
				),
			ctxPassed: () => promotionsService.continueApplyProjectSelection.mock.calls[0][4],
		},
	];

	const callRoute = async ({ call }: Route, requestCtx?: OperationContext) =>
		await call(
			Object.assign(mock<PublicApiRequest>(), {
				ctx: requestCtx,
				publicApiClient: 'other' as const,
			}),
		);

	it.each(routes)('$route passes the operation context of the request', async (route) => {
		await callRoute(route, ctx);

		expect(route.ctxPassed()).toEqual(
			route.route.toLowerCase().includes('apply') ? { ...ctx, skillApiKeyScopes: [] } : ctx,
		);
		expect(route.ctxPassed()?.security).toBe(ctx.security);
	});

	it.each(routes)('$route passes no operation context when the request has none', async (route) => {
		await callRoute(route, undefined);

		expect(route.ctxPassed()).toEqual(
			route.route.toLowerCase().includes('apply') ? { skillApiKeyScopes: [] } : undefined,
		);
	});

	it.each(routes.filter(({ route }) => route.toLowerCase().includes('apply')))(
		'$route passes Skill API-key scopes to the service',
		async (route) => {
			await route.call(
				Object.assign(mock<PublicApiRequest>(), {
					ctx,
					tokenGrant: { apiKeyScopes: ['promotions:apply', 'skill:update'] },
				}),
			);
			expect(route.ctxPassed()).toEqual({
				...ctx,
				skillApiKeyScopes: ['promotions:apply', 'skill:update'],
			});
		},
	);
});

describe('Promotion Skill content access', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const changes = mockInstance(PromotionChangeService);
	const controller = new PromotionsPublicController(moduleRegistry);
	const response = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		moduleRegistry.isActive.mockReturnValue(true);
	});

	it('checks Skill read scope when only a project-deletion conflict refers to Skills', async () => {
		changes.getInstanceApplyPreview.mockResolvedValue(
			mock<PromotionInstanceApplyPreviewDto>({
				resources: [],
				check: {
					conflicts: [
						{
							kind: 'skill',
							code: 'skill-conflict',
							id: 's1',
							reason: 'project-deletion',
						},
					],
				},
			}),
		);
		const request = mock<AuthenticatedRequest>({
			tokenGrant: { apiKeyScopes: ['promotions:apply'] },
		});
		await expect(controller.getInstanceApplyChanges(request, response, 'env-1')).rejects.toThrow(
			'skill:read',
		);
	});

	it('checks Skill read scope before loading content', async () => {
		const request = mock<AuthenticatedRequest>({
			tokenGrant: { apiKeyScopes: ['promotions:apply'] },
		});
		await expect(
			controller.getInstanceApplyChangeDetails(request, response, 'env-1', {
				keys: ['skill:skill-1'],
				commitSha: 'a'.repeat(40),
			}),
		).rejects.toThrow('skill:read');
		expect(changes.getInstanceApplyDetails).not.toHaveBeenCalled();
	});
});
