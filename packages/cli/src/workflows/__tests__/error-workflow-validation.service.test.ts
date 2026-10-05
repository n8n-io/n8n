import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity, WorkflowHistory } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { NodeTypes } from '@/node-types';
import {
	ErrorWorkflowValidationService,
	staticErrorWorkflowId,
} from '@/workflows/error-workflow-validation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type {
	PublishedWorkflowData,
	WorkflowPublishedDataService,
} from '@/workflows/workflow-published-data.service';

const ERROR_TRIGGER_TYPE = 'n8n-nodes-base.errorTrigger';

describe('staticErrorWorkflowId', () => {
	it('returns the id for a concrete reference', () => {
		expect(staticErrorWorkflowId('wf-1')).toBe('wf-1');
	});

	it.each([undefined, '', 'DEFAULT', '={{ $json.handler }}'])(
		'returns undefined for %s, which names no concrete workflow',
		(value) => {
			expect(staticErrorWorkflowId(value)).toBeUndefined();
		},
	);
});

describe('ErrorWorkflowValidationService', () => {
	const user = mock<User>({ id: 'user-1' });
	const nodeTypes = mockInstance(NodeTypes);

	let workflowFinderService: WorkflowFinderService;
	let workflowPublishedDataService: WorkflowPublishedDataService;
	let subworkflowPolicyChecker: SubworkflowPolicyChecker;
	let service: ErrorWorkflowValidationService;

	const buildErrorWorkflow = (overrides: Partial<WorkflowEntity> = {}) =>
		mock<WorkflowEntity>({
			id: 'err-wf',
			name: 'Error Handler',
			settings: {},
			activeVersionId: 'err-wf-v1',
			activeVersion: mock<WorkflowHistory>({
				nodes: [{ type: ERROR_TRIGGER_TYPE, disabled: false }] as INode[],
			}),
			...overrides,
		});

	const buildService = (useWorkflowPublicationService = false) => {
		const globalConfig = mock<GlobalConfig>({
			nodes: { errorTriggerType: ERROR_TRIGGER_TYPE },
			workflows: { useWorkflowPublicationService },
		});
		return new ErrorWorkflowValidationService(
			globalConfig,
			nodeTypes,
			workflowFinderService,
			workflowPublishedDataService,
			subworkflowPolicyChecker,
		);
	};

	const findProblem = async (svc = service) =>
		await svc.findProblem({ errorWorkflowId: 'err-wf', parentWorkflowId: 'wf-1', user });

	beforeEach(() => {
		workflowFinderService = mock<WorkflowFinderService>();
		workflowPublishedDataService = mock<WorkflowPublishedDataService>();
		subworkflowPolicyChecker = mock<SubworkflowPolicyChecker>();
		service = buildService();
	});

	it('accepts a published, callable workflow with an active Error Trigger', async () => {
		vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(buildErrorWorkflow());

		expect(await findProblem()).toBeUndefined();
	});

	it('requires read access, so a caller cannot probe ids outside their projects', async () => {
		vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(null);

		expect(await findProblem()).toEqual({ reason: 'not-found' });
		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
			'err-wf',
			user,
			['workflow:read'],
			expect.anything(),
		);
	});

	it('reports a workflow with no published version', async () => {
		vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(
			buildErrorWorkflow({ activeVersionId: null, activeVersion: null }),
		);

		expect(await findProblem()).toEqual({ reason: 'not-published', name: 'Error Handler' });
	});

	it('reports a published version whose Error Trigger is disabled', async () => {
		vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(
			buildErrorWorkflow({
				activeVersion: mock<WorkflowHistory>({
					nodes: [{ type: ERROR_TRIGGER_TYPE, disabled: true }] as INode[],
				}),
			}),
		);

		expect(await findProblem()).toEqual({
			reason: 'no-error-trigger',
			name: 'Error Handler',
			errorTriggerType: ERROR_TRIGGER_TYPE,
		});
	});

	it('reports a target whose caller policy excludes the parent workflow', async () => {
		vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(buildErrorWorkflow());
		vi.mocked(subworkflowPolicyChecker.check).mockRejectedValue(
			new SubworkflowPolicyDenialError({
				subworkflowId: 'err-wf',
				subworkflowProject: mock(),
				instanceUrl: 'http://localhost:5678',
				hasReadAccess: false,
			}),
		);

		expect(await findProblem()).toEqual({ reason: 'caller-policy', name: 'Error Handler' });
	});

	it('checks the policy against the parent workflow and the acting user', async () => {
		vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(buildErrorWorkflow());

		await findProblem();

		expect(subworkflowPolicyChecker.check).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'err-wf' }),
			'wf-1',
			undefined,
			'user-1',
		);
	});

	it('does not swallow an unexpected failure from the policy checker', async () => {
		vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(buildErrorWorkflow());
		vi.mocked(subworkflowPolicyChecker.check).mockRejectedValue(new Error('db is down'));

		await expect(findProblem()).rejects.toThrow('db is down');
	});

	describe('with the workflow publication service on', () => {
		// Runtime reads the published version from the service in this mode, so
		// validation must read it from the same place or it would accept a version
		// runtime will never run.
		it('reads the published nodes from the publication service', async () => {
			const withPublicationService = buildService(true);
			vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(buildErrorWorkflow());
			vi.mocked(workflowPublishedDataService.getPublishedWorkflowData).mockResolvedValue(
				mock<PublishedWorkflowData>({
					publishedVersion: mock<WorkflowHistory>({
						nodes: [{ type: ERROR_TRIGGER_TYPE }] as INode[],
					}),
				}),
			);

			expect(await findProblem(withPublicationService)).toBeUndefined();
			expect(workflowPublishedDataService.getPublishedWorkflowData).toHaveBeenCalledWith('err-wf');
		});

		it('reports not-published when the service has no published version', async () => {
			const withPublicationService = buildService(true);
			vi.mocked(workflowFinderService.findWorkflowForUser).mockResolvedValue(buildErrorWorkflow());
			vi.mocked(workflowPublishedDataService.getPublishedWorkflowData).mockResolvedValue(null);

			expect(await findProblem(withPublicationService)).toEqual({
				reason: 'not-published',
				name: 'Error Handler',
			});
		});
	});
});
