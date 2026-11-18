import type { AquariumEntity, EntityKind, EntitySource } from '../aquarium.types';
import { entityKey } from './source.utils';

const DEMO_PROJECTS = {
	sales: { id: 'demo-sales', name: 'Sales', type: 'team' },
	data: { id: 'demo-data', name: 'Data platform', type: 'team' },
	ops: { id: 'demo-ops', name: 'Operations', type: 'team' },
	support: { id: 'demo-support', name: 'Support', type: 'team' },
} as const;

function demo(
	name: string,
	project: keyof typeof DEMO_PROJECTS,
	kind: EntityKind,
	complexity: number,
	executionCount: number,
	failedCount: number,
	averageRunTimeMs: number,
	securityRisks?: number,
): AquariumEntity {
	const id = `demo-${name.toLowerCase().replace(/\W+/g, '-')}`;
	return {
		key: entityKey(kind, id),
		id,
		kind,
		name,
		project: DEMO_PROJECTS[project],
		metrics: {
			complexity,
			executionCount,
			failedCount,
			averageRunTimeMs,
			...(securityRisks === undefined ? {} : { securityRisks }),
		},
	};
}

/** Fixed fake data, so you can work on the tank without real workflows. */
export const DEMO_ENTITIES: AquariumEntity[] = [
	demo('Slack ping', 'ops', 'workflow', 2, 50_000, 10, 200),
	demo('Sync CRM contacts', 'sales', 'workflow', 6, 1_200, 30, 4_000),
	demo('Weekly report', 'data', 'workflow', 9, 12, 1, 45_000),
	demo('Invoice OCR', 'sales', 'workflow', 14, 300, 40, 20_000),
	demo('Flaky scraper', 'data', 'workflow', 5, 400, 180, 3_000),
	demo('Lead enrichment', 'sales', 'workflow', 22, 2_000, 100, 8_000),
	demo('Data warehouse ETL', 'data', 'workflow', 45, 30, 3, 600_000),
	demo('Webhook relay', 'ops', 'workflow', 3, 8_000, 0, 100, 1),
	demo('Draft', 'ops', 'workflow', 1, 0, 0, 0),
	demo('Error handler', 'ops', 'workflow', 4, 150, 0, 500),
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
