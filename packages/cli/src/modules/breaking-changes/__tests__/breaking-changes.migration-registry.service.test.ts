import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { NodeMigration } from '../migrations/node-migration';

// Control the migration list the registry loads so the tests don't depend on
// which real migrations happen to be registered.
const { migA, migB, migADuplicate } = vi.hoisted(() => ({
	migA: { ruleId: 'rule-a', migrate: vi.fn() },
	migB: { ruleId: 'rule-b', migrate: vi.fn() },
	// Same ruleId as migA, to exercise the duplicate-registration branch.
	migADuplicate: { ruleId: 'rule-a', migrate: vi.fn() },
}));

vi.mock('../migrations', () => ({ nodeMigrations: [migA, migB, migADuplicate] }));

import { MigrationRegistry } from '../breaking-changes.migration-registry.service';

describe('MigrationRegistry', () => {
	const scopedLogger = mock<Logger>();
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });
	let registry: MigrationRegistry;

	beforeEach(() => {
		vi.clearAllMocks();
		registry = new MigrationRegistry(logger);
	});

	it('registers migrations keyed by their ruleId', () => {
		registry.registerAll();

		expect(registry.has('rule-b')).toBe(true);
		expect(registry.get('rule-b')).toBe(migB as unknown as NodeMigration);
	});

	it('reports unknown rules as unregistered', () => {
		registry.registerAll();

		expect(registry.has('unknown-rule')).toBe(false);
		expect(registry.get('unknown-rule')).toBeUndefined();
	});

	it('warns and keeps the last migration when a ruleId is registered twice', () => {
		registry.registerAll();

		expect(scopedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('rule-a'));
		expect(registry.get('rule-a')).toBe(migADuplicate as unknown as NodeMigration);
	});
});
