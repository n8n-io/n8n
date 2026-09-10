import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { AvailableTypesController } from '../available-types.controller';
import type {
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

/**
 * Reading effective availability requires only project membership, so this route is gated by
 * `project:read` — not the `nodeTypePolicy:manage` scope that authoring the policy takes.
 */
describe('AvailableTypesController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AvailableTypesController as never,
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

	it('is gated by the node type policies license feature', () => {
		for (const { route } of routeCases) {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.NODE_TYPE_POLICIES);
		}
	});
});

describe('AvailableTypesController.getAvailableTypes', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const nodeTypes = mock<NodeTypes>();
	const controller = new AvailableTypesController(service, nodeTypes);

	const request = mock<Request>();
	const response = mock<Response>();

	const verdict = (overrides: Partial<ComposedTypeVerdict>): ComposedTypeVerdict => ({
		name: 'n8n-nodes-base.slack',
		action: 'allow',
		scope: 'instance',
		matchedRuleId: null,
		optInAvailable: false,
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		nodeTypes.getKnownTypes.mockReturnValue({});
	});

	it('evaluates every known type name, including synthesized tool variants', async () => {
		nodeTypes.getKnownTypes.mockReturnValue({
			'n8n-nodes-base.slack': { className: 'Slack', sourcePath: '' },
			'n8n-nodes-base.slackTool': { className: 'Slack', sourcePath: '' },
		});
		service.evaluateComposedTypes.mockResolvedValue([]);

		await controller.getAvailableTypes(request, response, 'project-1');

		expect(service.evaluateComposedTypes).toHaveBeenCalledWith('node-types', 'project-1', [
			'n8n-nodes-base.slack',
			'n8n-nodes-base.slackTool',
		]);
	});

	it('reports an available type without a reason', async () => {
		service.evaluateComposedTypes.mockResolvedValue([verdict({ matchedRuleId: 'r1' })]);

		const result = await controller.getAvailableTypes(request, response, 'project-1');

		expect(result).toStrictEqual([{ name: 'n8n-nodes-base.slack', available: true }]);
	});

	it('reports the denying scope and rule of an unavailable type', async () => {
		service.evaluateComposedTypes.mockResolvedValue([
			verdict({ action: 'deny', scope: 'project', matchedRuleId: 'r1' }),
		]);

		const result = await controller.getAvailableTypes(request, response, 'project-1');

		expect(result).toEqual([
			{
				name: 'n8n-nodes-base.slack',
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

		const result = await controller.getAvailableTypes(request, response, 'project-1');

		expect(result).toStrictEqual([
			{ name: 'n8n-nodes-base.slack', available: false, scope: 'project' },
		]);
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

		const result = await controller.getAvailableTypes(request, response, 'project-1');

		expect(result).toEqual([
			{
				name: 'n8n-nodes-base.slack',
				available: false,
				scope: 'instance',
				matchedRuleId: 'delegate-rule',
				optInAvailable: true,
			},
		]);
	});
});
