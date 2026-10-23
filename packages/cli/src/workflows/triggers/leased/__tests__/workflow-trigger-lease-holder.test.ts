import type { OperationContext, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { Lease } from '@n8n/leases';
import { LeaseEndedError } from '@n8n/leases';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { WorkflowExpression } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type {
	NonWebhookTriggerRegistrar,
	NonWebhookTriggerRegistrationContext,
	PreparedNonWebhookTriggerRegistration,
} from '@/workflows/triggers/non-webhook-trigger-registrar';
import type {
	TriggerExecutionContextFactory,
	TriggerWorkflowRunner,
} from '@/workflows/triggers/trigger-execution-context.factory';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { createNodeTypes, logger, node } from '../../__tests__/trigger-test-utils';
import type { LeasedTriggerExecutions, LeasedTriggerRun } from '../leased-trigger-executions';
import type { LeasedTriggerRegistry } from '../leased-trigger-registry';
import { WorkflowTriggerLeaseHolder } from '../workflow-trigger-lease-holder';

const trigger = node('kafka', 'trigger');

const setup = ({ published = true } = {}) => {
	vi.spyOn(WorkflowExpression.prototype, 'acquireIsolate').mockResolvedValue(true);
	vi.spyOn(WorkflowExpression.prototype, 'releaseIsolate').mockResolvedValue();
	vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
		mock<IWorkflowExecuteAdditionalData>(),
	);
	const registry = mock<LeasedTriggerRegistry>();
	const workflows = mock<WorkflowRepository>();
	workflows.findOneBy.mockResolvedValue(
		mock<WorkflowEntity>({
			id: 'wf-1',
			name: 'Orders',
			activeVersionId: published ? 'v2' : null,
			settings: {},
			staticData: {},
		}),
	);
	const executionContexts = mock<TriggerExecutionContextFactory>();
	executionContexts.loadPublishedWorkflowData.mockResolvedValue(
		mock<IWorkflowBase>({ nodes: [trigger], connections: {} }),
	);
	const registrar = mock<NonWebhookTriggerRegistrar>();
	let onTriggerFailure: NonWebhookTriggerRegistrationContext['onTriggerFailure'] = () => {};
	let runWorkflow: TriggerWorkflowRunner | undefined;
	registrar.createRegistrationContext.mockImplementation((_workflow, context) => {
		onTriggerFailure = context.onTriggerFailure;
		runWorkflow = context.runWorkflow;
		return mock<PreparedNonWebhookTriggerRegistration>();
	});
	const staticData = mock<WorkflowStaticDataService>();
	const executions = mock<LeasedTriggerExecutions>();
	const holder = new WorkflowTriggerLeaseHolder(
		logger,
		registry,
		workflows,
		createNodeTypes(),
		registrar,
		executionContexts,
		staticData,
		executions,
	);
	return {
		registry,
		staticData,
		executions,
		holder,
		failAtRuntime: (error: Error) => onTriggerFailure({ error } as never),
		emit: async () =>
			await runWorkflow?.(
				mock<IWorkflowBase>(),
				trigger,
				[[]],
				mock<IWorkflowExecuteAdditionalData>(),
				'trigger',
			),
	};
};

const lease = (signal: AbortSignal) => {
	const ready = vi.fn(async () => {});
	const held: Lease<OperationContext> = {
		kind: 'workflow-trigger',
		key: 'wf-1:kafka',
		data: { workflowId: 'wf-1', nodeId: 'kafka', registration: {} },
		fencingToken: 3,
		signal,
		ready,
		isHeld: async () => true,
	};
	return { held, ready };
};

describe('WorkflowTriggerLeaseHolder', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('arms the one trigger node, reports ready, and disarms when the lease ends', async () => {
		const { registry, staticData, holder } = setup();
		const controller = new AbortController();
		const { held, ready } = lease(controller.signal);

		const holding = holder.hold(held);
		await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());

		expect(registry.addTriggers).toHaveBeenCalledWith(
			'wf-1',
			expect.objectContaining({ id: 'wf-1' }),
			['kafka'],
			expect.anything(),
			'trigger',
			'activate',
			expect.anything(),
			expect.anything(),
		);
		expect(registry.removeTriggers).not.toHaveBeenCalled();

		controller.abort(new LeaseEndedError('lost'));
		await holding;

		expect(registry.removeTriggers).toHaveBeenCalledWith('wf-1', new Set(['kafka']));
		expect(staticData.saveStaticData).toHaveBeenCalledOnce();
	});

	it('disarms and throws the runtime error when the trigger fails', async () => {
		const { registry, holder, failAtRuntime } = setup();
		const { held, ready } = lease(new AbortController().signal);

		const holding = holder.hold(held);
		await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
		failAtRuntime(new Error('broker connection closed'));

		await expect(holding).rejects.toThrow('broker connection closed');
		expect(registry.removeTriggers).toHaveBeenCalledWith('wf-1', new Set(['kafka']));
	});

	it('starts every emit through the leased executions, fenced by the lease', async () => {
		const { executions, holder, emit } = setup();
		executions.run.mockResolvedValue('exec-1');
		const controller = new AbortController();
		const { held, ready } = lease(controller.signal);

		const holding = holder.hold(held);
		await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());

		await expect(emit()).resolves.toBe('exec-1');
		expect(executions.run).toHaveBeenCalledWith(
			{ fence: held, onLeaseLost: expect.any(Function) },
			expect.anything(),
			trigger,
			[[]],
			expect.anything(),
			'trigger',
		);

		controller.abort(new LeaseEndedError('lost'));
		await holding;
	});

	it('disarms and ends the hold without an error when an execution finds the lease lost', async () => {
		const { registry, staticData, executions, holder, emit } = setup();
		executions.run.mockImplementation(async (leasedRun: LeasedTriggerRun) => {
			leasedRun.onLeaseLost();
			return undefined;
		});
		const { held, ready } = lease(new AbortController().signal);

		const holding = holder.hold(held);
		await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());

		await expect(emit()).resolves.toBeUndefined();
		await expect(holding).resolves.toBeUndefined();
		expect(registry.removeTriggers).toHaveBeenCalledWith('wf-1', new Set(['kafka']));
		expect(staticData.saveStaticData).toHaveBeenCalledOnce();
	});

	it('fails the start for a workflow that is not published', async () => {
		const { registry, holder } = setup({ published: false });
		const { held, ready } = lease(new AbortController().signal);

		await expect(holder.hold(held)).rejects.toThrow('not published');
		expect(registry.addTriggers).not.toHaveBeenCalled();
		expect(ready).not.toHaveBeenCalled();
	});

	it('fails the start when arming throws, without reporting ready', async () => {
		const { registry, holder } = setup();
		registry.addTriggers.mockRejectedValue(new Error('invalid credentials'));
		const { held, ready } = lease(new AbortController().signal);

		await expect(holder.hold(held)).rejects.toThrow('invalid credentials');
		expect(ready).not.toHaveBeenCalled();
	});

	it('rejects lease data without a workflow and node id', async () => {
		const { holder } = setup();
		const { held } = lease(new AbortController().signal);

		await expect(holder.hold({ ...held, data: {} })).rejects.toThrow('invalid lease data');
	});
});
