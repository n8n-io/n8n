import type { WorkflowPublishedVersionRepository } from '@n8n/db';
import type { LeaseKind } from '@n8n/leases';
import { mock } from 'vitest-mock-extended';

import type { ClusterLeases } from '@/scheduling/leases/cluster-leases';
import { triggerRegistration } from '@/workflows/publication/trigger-diff';

import { createNodeTypes, node } from '../../__tests__/trigger-test-utils';
import type { LeasedTriggerPolicy } from '../leased-trigger-policy';
import type { WorkflowTriggerLeaseHolder } from '../workflow-trigger-lease-holder';
import { WorkflowTriggerLeases } from '../workflow-trigger-leases';

const leasedTrigger = node('kafka', 'trigger');
const pollTrigger = node('poller', 'poll');
const disabledTrigger = node('off', 'trigger', { disabled: true });

const setup = ({ enabled = true } = {}) => {
	const policy = mock<LeasedTriggerPolicy>();
	policy.isEnabled.mockReturnValue(enabled);
	policy.isLeased.mockImplementation((n) => n.type === 'trigger');
	const clusterLeases = mock<ClusterLeases>();
	const publishedVersions = mock<WorkflowPublishedVersionRepository>();
	const holder = mock<WorkflowTriggerLeaseHolder>();
	const leases = new WorkflowTriggerLeases(
		policy,
		clusterLeases,
		publishedVersions,
		createNodeTypes(),
		holder,
	);
	return { clusterLeases, publishedVersions, holder, leases };
};

const registeredKind = (clusterLeases: ReturnType<typeof setup>['clusterLeases']): LeaseKind =>
	clusterLeases.registerKind.mock.calls[0][0];

describe('WorkflowTriggerLeases', () => {
	it('registers the workflow-trigger kind with the lease holder', () => {
		const { clusterLeases, holder, leases } = setup();

		leases.init();

		expect(registeredKind(clusterLeases)).toMatchObject({
			name: 'workflow-trigger',
			handler: holder,
		});
	});

	it('registers nothing when no trigger is leased', () => {
		const { clusterLeases, leases } = setup({ enabled: false });

		leases.init();

		expect(clusterLeases.registerKind).not.toHaveBeenCalled();
	});

	it('wants one lease for each enabled leased trigger of a published workflow', async () => {
		const { clusterLeases, publishedVersions, leases } = setup();
		publishedVersions.findPublishedNodes.mockResolvedValue([
			{ workflowId: 'wf-1', nodes: [leasedTrigger, pollTrigger, disabledTrigger] },
			{ workflowId: 'wf-2', nodes: [pollTrigger] },
		]);
		leases.init();

		const desired = await registeredKind(clusterLeases).listDesired();

		expect(publishedVersions.findPublishedNodes).toHaveBeenCalledWith(undefined);
		expect(desired).toEqual([
			{
				key: 'wf-1:kafka',
				data: {
					workflowId: 'wf-1',
					nodeId: 'kafka',
					registration: triggerRegistration(leasedTrigger),
				},
			},
		]);
	});

	it('reads only the workflows of the asked keys and returns only those keys', async () => {
		const { clusterLeases, publishedVersions, leases } = setup();
		publishedVersions.findPublishedNodes.mockResolvedValue([
			{ workflowId: 'wf-1', nodes: [leasedTrigger, node('other', 'trigger')] },
		]);
		leases.init();

		const desired = await registeredKind(clusterLeases).listDesired(['wf-1:kafka', 'wf-9:kafka']);

		expect(publishedVersions.findPublishedNodes).toHaveBeenCalledWith(['wf-1', 'wf-9']);
		expect(desired.map((spec) => spec.key)).toEqual(['wf-1:kafka']);
	});

	it('syncs the leases of the leased triggers in every given version', async () => {
		const { clusterLeases, leases } = setup();

		await leases.changed('wf-1', [
			[leasedTrigger, pollTrigger],
			[node('renamed', 'trigger')],
			null,
		]);

		expect(clusterLeases.changed).toHaveBeenCalledWith('workflow-trigger', [
			'wf-1:kafka',
			'wf-1:renamed',
		]);
	});

	it('syncs nothing for versions without leased triggers', async () => {
		const { clusterLeases, leases } = setup();

		await leases.changed('wf-1', [[pollTrigger], undefined]);

		expect(clusterLeases.changed).not.toHaveBeenCalled();
	});
});
