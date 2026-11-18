import type { AquariumEntity, EntityKind, EntitySource, WorkflowDesign } from '../aquarium.types';
import { entityKey } from './source.utils';

const DEMO_PROJECTS = {
	sales: { id: 'demo-sales', name: 'Sales', type: 'team' },
	data: { id: 'demo-data', name: 'Data platform', type: 'team' },
	ops: { id: 'demo-ops', name: 'Operations', type: 'team' },
	support: { id: 'demo-support', name: 'Support', type: 'team' },
	legacy: { id: 'demo-legacy', name: 'Legacy', type: 'team' },
} as const;

interface DemoExtras {
	/** Runs that are paused now. */
	waiting?: number;
	/** Overrides of the default design: only plain nodes, no error workflow. */
	design?: Partial<WorkflowDesign>;
	/** Security checks that the workflow fails. */
	securityRisks?: number;
}

function demo(
	name: string,
	project: keyof typeof DEMO_PROJECTS,
	kind: EntityKind,
	complexity: number,
	executionCount: number,
	failedCount: number,
	averageRunTimeMs: number,
	extras: DemoExtras = {},
): AquariumEntity {
	const id = `demo-${name.toLowerCase().replace(/\W+/g, '-')}`;
	const design: WorkflowDesign = {
		nodeCount: complexity,
		codeNodeCount: 0,
		branchNodeCount: 0,
		disabledNodeCount: 0,
		duplicateNodeCount: 0,
		subWorkflowCallCount: 0,
		waitNodeCount: 0,
		hasErrorWorkflow: false,
		...extras.design,
	};
	return {
		key: entityKey(kind, id),
		id,
		kind,
		name,
		project: DEMO_PROJECTS[project],
		...(kind === 'workflow' ? { design } : {}),
		metrics: {
			complexity,
			executionCount,
			failedCount,
			averageRunTimeMs,
			waitingCount: extras.waiting ?? 0,
			finishedCount: Math.max(0, executionCount - (extras.waiting ?? 0)),
			...(extras.securityRisks === undefined ? {} : { securityRisks: extras.securityRisks }),
		},
	};
}

/** Fixed fake data, so you can work on the tank without real workflows. */
export const DEMO_ENTITIES: AquariumEntity[] = [
	// No failures in Operations, so its tank shows the Positive look.
	demo('Slack ping', 'ops', 'workflow', 2, 50_000, 0, 200, {
		design: { hasErrorWorkflow: true },
	}),
	// Waits for a manager to approve each contact, so many runs are paused, not broken.
	demo('Sync CRM contacts', 'sales', 'workflow', 6, 1_200, 30, 4_000, {
		waiting: 180,
		design: { waitNodeCount: 1, hasErrorWorkflow: true },
	}),
	// Every run is waiting for a signature: all paused, none finished. Not broken.
	demo('Contract approvals', 'sales', 'workflow', 7, 6, 0, 0, {
		waiting: 6,
		design: { waitNodeCount: 2, hasErrorWorkflow: true },
	}),
	demo('Weekly report', 'data', 'workflow', 9, 12, 1, 45_000, {
		waiting: 2,
		design: { waitNodeCount: 1, branchNodeCount: 2 },
	}),
	demo('Invoice OCR', 'sales', 'workflow', 14, 300, 40, 20_000, {
		design: { codeNodeCount: 4, hasErrorWorkflow: true },
	}),
	demo('Flaky scraper', 'data', 'workflow', 5, 400, 180, 3_000, {
		design: { codeNodeCount: 3, disabledNodeCount: 2, duplicateNodeCount: 1 },
	}),
	// Big, flat and copy-pasted: the hardest to maintain.
	demo('Lead enrichment', 'sales', 'workflow', 22, 2_000, 100, 8_000, {
		design: { branchNodeCount: 9, duplicateNodeCount: 4, codeNodeCount: 2 },
	}),
	// Big, but split into sub-workflows, so its size costs nothing.
	demo('Data warehouse ETL', 'data', 'workflow', 45, 30, 3, 600_000, {
		design: { subWorkflowCallCount: 4, codeNodeCount: 2, hasErrorWorkflow: true },
	}),
	demo('Webhook relay', 'ops', 'workflow', 3, 8_000, 0, 100, { securityRisks: 1 }),
	demo('Draft', 'ops', 'workflow', 1, 0, 0, 0, { design: { disabledNodeCount: 1 } }),
	demo('Error handler', 'ops', 'workflow', 4, 150, 0, 500),
	// Most runs fail, so the Legacy tank shows the Critical look.
	demo('Old FTP sync', 'legacy', 'workflow', 8, 240, 200, 6_000, {
		design: { codeNodeCount: 3, disabledNodeCount: 2 },
	}),
	demo('Fax gateway', 'legacy', 'workflow', 3, 60, 40, 900),
	demo('Support triage', 'support', 'agent', 3, 400, 12, 15_000),
	demo('Research assistant', 'data', 'agent', 18, 60, 4, 90_000),
	demo('Onboarding buddy', 'support', 'agent', 1, 5, 0, 5_000),
];

export const demoSource: EntitySource = {
	id: 'demo',
	async load() {
		return DEMO_ENTITIES;
	},
};
