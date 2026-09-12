import type {
	NodeTypePolicyEffectiveWriteResultPublicDto,
	PutInstancePolicyDto,
	PutProjectPolicyDto,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { NODE_TYPES_KIND } from '@/modules/type-availability-policies/constants';
import type { EffectivePolicy } from '@/modules/type-availability-policies/type-availability-policy.service';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';

import { NodeTypePoliciesPublicController } from '../node-type-policies.public.controller';

/**
 * Every public route must carry the same guards as the internal controllers it mirrors: the
 * node type policies license feature, the `nodeTypePolicy:manage` API-key scope, and a
 * `nodeTypePolicy:manage` RBAC check that is global-only everywhere except on the two
 * project-scoped routes.
 */
describe('NodeTypePoliciesPublicController route metadata', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		NodeTypePoliciesPublicController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));
	const projectHandlers = new Set(['getProjectPolicy', 'putProjectPolicy']);

	it('registers every route of the internal instance and project controllers', () => {
		expect(routeCases.map(({ handlerName }) => handlerName).sort()).toEqual(
			['getInstancePolicy', 'getProjectPolicy', 'putInstancePolicy', 'putProjectPolicy'].sort(),
		);
	});

	it.each(routeCases)(
		'$handlerName requires the nodeTypePolicy:manage API key scope',
		({ route }) => {
			expect(route.apiKeyScope).toBe('nodeTypePolicy:manage');
		},
	);

	it.each(routeCases)(
		'$handlerName is gated by a nodeTypePolicy:manage RBAC check',
		({ route }) => {
			expect(route.accessScope?.scope).toBe('nodeTypePolicy:manage');
		},
	);

	it.each(routeCases)(
		'$handlerName is global-only unless it addresses a project',
		({ handlerName, route }) => {
			expect(route.accessScope?.globalOnly).toBe(!projectHandlers.has(handlerName));
		},
	);

	it.each(routeCases)(
		'$handlerName is gated by the node type policies license feature',
		({ route }) => {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.NODE_TYPE_POLICIES);
		},
	);

	it.each(routeCases)(
		'$handlerName documents a success status and the 503 for an inactive module',
		({ route }) => {
			expect(route.successStatus).toBeDefined();
			expect(route.errorResponses?.some((response) => response.status === 503)).toBe(true);
		},
	);

	it.each(routeCases)('$handlerName declares a response DTO unless it answers 204', ({ route }) => {
		if (route.successStatus === 204) {
			expect(route.responseDto).toBeUndefined();
		} else {
			expect(route.responseDto).toBeDefined();
		}
	});
});

describe('NodeTypePoliciesPublicController with the module disabled', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const controller = new NodeTypePoliciesPublicController(moduleRegistry);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		moduleRegistry.isActive.mockReturnValue(false);
	});

	it('answers 503 before touching the service', async () => {
		await expect(controller.getInstancePolicy()).rejects.toThrow(ServiceUnavailableError);
		await expect(controller.getProjectPolicy(req, res, 'project-id')).rejects.toThrow(
			ServiceUnavailableError,
		);

		expect(moduleRegistry.isActive).toHaveBeenCalledWith('type-availability-policies');
	});
});

describe('NodeTypePoliciesPublicController handler bodies', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const service = mock<TypeAvailabilityPolicyService>();
	const controller = new NodeTypePoliciesPublicController(moduleRegistry);
	const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: 'user-id' }) });
	const res = mock<Response>();

	beforeEach(() => {
		moduleRegistry.isActive.mockReturnValue(true);
		Container.set(TypeAvailabilityPolicyService, service);
	});

	afterEach(() => {
		Container.reset();
	});

	const rules = [
		{ id: 'r1', action: 'deny' as const, selector: { kind: 'name' as const, value: 'a.b' } },
	];

	const effectivePolicy: EffectivePolicy = {
		scopeId: 'scope-id',
		kind: NODE_TYPES_KIND,
		projectId: null,
		defaultAction: 'allow',
		version: 3,
		rules,
		attachments: [],
	};

	const effectiveWrite = {
		scopeId: 'scope-id',
		defaultAction: 'deny' as const,
		version: 4,
		rules,
		warnings: [{ ruleId: 'r2', shadowedByRuleId: 'r1' }],
	};

	it('getInstancePolicy reads the null-project scope and maps the response', async () => {
		service.getEffectivePolicy.mockResolvedValue(effectivePolicy);

		const result = await controller.getInstancePolicy();

		expect(service.getEffectivePolicy).toHaveBeenCalledWith(NODE_TYPES_KIND, null);
		expect(result).toEqual({
			scopeId: effectivePolicy.scopeId,
			rules: effectivePolicy.rules,
			defaultAction: effectivePolicy.defaultAction,
			version: effectivePolicy.version,
		});
	});

	it('getProjectPolicy reads the given project scope and maps the response', async () => {
		service.getEffectivePolicy.mockResolvedValue({ ...effectivePolicy, projectId: 'project-id' });

		const result = await controller.getProjectPolicy(req, res, 'project-id');

		expect(service.getEffectivePolicy).toHaveBeenCalledWith(NODE_TYPES_KIND, 'project-id');
		expect(result).toEqual({
			scopeId: effectivePolicy.scopeId,
			rules: effectivePolicy.rules,
			defaultAction: effectivePolicy.defaultAction,
			version: effectivePolicy.version,
		});
	});

	it('putInstancePolicy forwards rules, defaultAction, version, and the caller id, and maps the result', async () => {
		service.setEffectivePolicy.mockResolvedValue(effectiveWrite);
		const dto = { rules, defaultAction: 'deny', version: 3 } as PutInstancePolicyDto;

		const result: NodeTypePolicyEffectiveWriteResultPublicDto = await controller.putInstancePolicy(
			req,
			res,
			dto,
		);

		expect(service.setEffectivePolicy).toHaveBeenCalledWith(
			NODE_TYPES_KIND,
			null,
			{ rules: dto.rules, defaultAction: dto.defaultAction },
			dto.version,
			'user-id',
		);
		expect(result).toEqual({
			scopeId: effectiveWrite.scopeId,
			rules: effectiveWrite.rules,
			defaultAction: effectiveWrite.defaultAction,
			version: effectiveWrite.version,
			warnings: effectiveWrite.warnings,
		});
	});

	it('putProjectPolicy forwards the project id, rules, defaultAction, version, and the caller id, and maps the result', async () => {
		service.setEffectivePolicy.mockResolvedValue(effectiveWrite);
		const dto = { rules, defaultAction: 'deny', version: 3 } as PutProjectPolicyDto;

		const result = await controller.putProjectPolicy(req, res, 'project-id', dto);

		expect(service.setEffectivePolicy).toHaveBeenCalledWith(
			NODE_TYPES_KIND,
			'project-id',
			{ rules: dto.rules, defaultAction: dto.defaultAction },
			dto.version,
			'user-id',
		);
		expect(result).toEqual({
			scopeId: effectiveWrite.scopeId,
			rules: effectiveWrite.rules,
			defaultAction: effectiveWrite.defaultAction,
			version: effectiveWrite.version,
			warnings: effectiveWrite.warnings,
		});
	});
});
