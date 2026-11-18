import type { AquariumEntity, EntityKind, EntitySource } from '../aquarium.types';
import { entityKey } from './source.utils';

function demo(
	name: string,
	kind: EntityKind,
	complexity: number,
	executionCount: number,
	failedCount: number,
	averageRunTimeMs: number,
): AquariumEntity {
	const id = `demo-${name.toLowerCase().replace(/\W+/g, '-')}`;
	return {
		key: entityKey(kind, id),
		id,
		kind,
		name,
		metrics: { complexity, executionCount, failedCount, averageRunTimeMs },
	};
}

/** Fixed fake data, so you can work on the tank without real workflows. */
export const DEMO_ENTITIES: AquariumEntity[] = [
	demo('Slack ping', 'workflow', 2, 50_000, 10, 200),
	demo('Sync CRM contacts', 'workflow', 6, 1_200, 30, 4_000),
	demo('Weekly report', 'workflow', 9, 12, 1, 45_000),
	demo('Invoice OCR', 'workflow', 14, 300, 40, 20_000),
	demo('Flaky scraper', 'workflow', 5, 400, 180, 3_000),
	demo('Lead enrichment', 'workflow', 22, 2_000, 100, 8_000),
	demo('Data warehouse ETL', 'workflow', 45, 30, 3, 600_000),
	demo('Webhook relay', 'workflow', 3, 8_000, 0, 100),
	demo('Draft', 'workflow', 1, 0, 0, 0),
	demo('Error handler', 'workflow', 4, 150, 0, 500),
	demo('Support triage', 'agent', 3, 400, 12, 15_000),
	demo('Research assistant', 'agent', 18, 60, 4, 90_000),
	demo('Onboarding buddy', 'agent', 1, 5, 0, 5_000),
];

export const demoSource: EntitySource = {
	id: 'demo',
	async load() {
		return DEMO_ENTITIES;
	},
};
