import type { LicenseState } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PostHogClient } from '@/posthog';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

// The controller transitively imports @n8n/instance-ai (via eval-plan.service),
// which pulls in Mastra's ESM-only bundle. Short-circuit the module in the
// test graph — the controller doesn't exercise it directly.
jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: () => ({
		structuredOutput: () => ({ generate: async () => ({ structuredOutput: undefined }) }),
	}),
}));

import { EvalPlanController } from '../eval-plan.controller';
import type { EvalPlanService } from '../eval-plan.service';

describe('EvalPlanController', () => {
	let licenseState: jest.Mocked<LicenseState>;
	let postHogClient: jest.Mocked<PostHogClient>;
	let workflowFinderService: jest.Mocked<WorkflowFinderService>;
	let evalPlanService: jest.Mocked<EvalPlanService>;
	let controller: EvalPlanController;

	const user = { id: 'user-1' } as User;
	const req = { user } as never;
	const res = {} as never;

	beforeEach(() => {
		licenseState = mock<LicenseState>();
		postHogClient = mock<PostHogClient>();
		workflowFinderService = mock<WorkflowFinderService>();
		evalPlanService = mock<EvalPlanService>();

		controller = new EvalPlanController(
			licenseState,
			postHogClient,
			workflowFinderService,
			evalPlanService,
		);

		// Default: license on, flag on, workflow found.
		licenseState.isAiAssistantLicensed.mockReturnValue(true);
		postHogClient.getFeatureFlags.mockResolvedValue({ eval_mode_experiment: 'variant' });
		workflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-1' } as never);
		evalPlanService.generatePlan.mockResolvedValue({ datasetRows: [], nodePlacements: [] });
	});

	const payload = { workflowId: 'wf-1', userIntent: 'check politeness' } as never;

	it('throws ForbiddenError when AI Assistant is not licensed', async () => {
		licenseState.isAiAssistantLicensed.mockReturnValue(false);
		await expect(controller.create(req, res, payload)).rejects.toThrow(ForbiddenError);
	});

	it('throws ForbiddenError when the experiment flag is off', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({});
		await expect(controller.create(req, res, payload)).rejects.toThrow(ForbiddenError);
	});

	it('throws NotFoundError when the workflow is not accessible', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
		await expect(controller.create(req, res, payload)).rejects.toThrow(NotFoundError);
	});

	it('returns the generated plan on the happy path', async () => {
		const plan = {
			datasetRows: [{ prompt: 'hello' }],
			nodePlacements: [{ kind: 'trigger' as const, config: {} }],
		};
		evalPlanService.generatePlan.mockResolvedValue(plan);

		const result = await controller.create(req, res, payload);

		expect(result).toBe(plan);
		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'workflow:read',
		]);
		expect(evalPlanService.generatePlan).toHaveBeenCalledWith({ id: 'wf-1' }, 'check politeness');
	});

	it('surfaces the empty plan the service returns when the agent fails', async () => {
		// Service already collapses agent failures to the empty plan; this test
		// pins the controller's passthrough behaviour rather than re-testing the
		// service's fallback.
		const emptyPlan = { datasetRows: [], nodePlacements: [] };
		evalPlanService.generatePlan.mockResolvedValue(emptyPlan);

		const result = await controller.create(req, res, payload);

		expect(result).toEqual(emptyPlan);
	});
});
