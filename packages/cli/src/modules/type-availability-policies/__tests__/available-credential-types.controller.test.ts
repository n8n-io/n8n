import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';

import { AvailableCredentialTypesController } from '../available-credential-types.controller';
import type {
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

/**
 * Reading effective availability requires only project membership, so this route is gated by
 * `project:read` — not the `credentialTypePolicy:manage` scope that authoring the policy takes.
 */
describe('AvailableCredentialTypesController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AvailableCredentialTypesController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('registers at least one route', () => {
		expect(routeCases.length).toBeGreaterThan(0);
	});

	it.each(routeCases)(
		'$handlerName is gated by a project-scoped project:read check',
		({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope).toBe('project:read');
		},
	);

	it('is gated by the type availability policies license feature', () => {
		for (const { route } of routeCases) {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		}
	});
});

describe('AvailableCredentialTypesController.getAvailableCredentialTypes', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const credentialTypes = mock<CredentialTypes>();
	const controller = new AvailableCredentialTypesController(service, credentialTypes);

	const request = mock<Request>();
	const response = mock<Response>();

	const verdict = (overrides: Partial<ComposedTypeVerdict>): ComposedTypeVerdict => ({
		name: 'slackApi',
		action: 'allow',
		scope: 'instance',
		matchedRuleId: null,
		optInAvailable: false,
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		credentialTypes.getKnownTypes.mockReturnValue({});
	});

	it('evaluates every known type name, none of them package-prefixed like a node type', async () => {
		credentialTypes.getKnownTypes.mockReturnValue({
			slackApi: { className: 'SlackApi', sourcePath: '' },
			githubApi: { className: 'GithubApi', sourcePath: '' },
		});
		service.evaluateComposedTypes.mockResolvedValue([]);

		await controller.getAvailableCredentialTypes(request, response, 'project-1');

		expect(service.evaluateComposedTypes).toHaveBeenCalledWith('credential-types', 'project-1', [
			'slackApi',
			'githubApi',
		]);
	});

	it('reports an available type without a reason', async () => {
		service.evaluateComposedTypes.mockResolvedValue([verdict({ matchedRuleId: 'r1' })]);

		const result = await controller.getAvailableCredentialTypes(request, response, 'project-1');

		expect(result).toStrictEqual([{ name: 'slackApi', available: true }]);
	});

	it('reports the denying scope and rule of an unavailable type', async () => {
		service.evaluateComposedTypes.mockResolvedValue([
			verdict({ action: 'deny', scope: 'project', matchedRuleId: 'r1' }),
		]);

		const result = await controller.getAvailableCredentialTypes(request, response, 'project-1');

		expect(result).toEqual([
			{
				name: 'slackApi',
				available: false,
				scope: 'project',
				matchedRuleId: 'r1',
			},
		]);
	});

	it('omits matchedRuleId when the scope default action denied', async () => {
		service.evaluateComposedTypes.mockResolvedValue([
			verdict({ action: 'deny', scope: 'project' }),
		]);

		const result = await controller.getAvailableCredentialTypes(request, response, 'project-1');

		expect(result).toStrictEqual([{ name: 'slackApi', available: false, scope: 'project' }]);
	});

	it('marks an unmet delegation as opt-in available', async () => {
		service.evaluateComposedTypes.mockResolvedValue([
			verdict({
				action: 'deny',
				scope: 'instance',
				matchedRuleId: 'delegate-rule',
				optInAvailable: true,
			}),
		]);

		const result = await controller.getAvailableCredentialTypes(request, response, 'project-1');

		expect(result).toEqual([
			{
				name: 'slackApi',
				available: false,
				scope: 'instance',
				matchedRuleId: 'delegate-rule',
				optInAvailable: true,
			},
		]);
	});
});
