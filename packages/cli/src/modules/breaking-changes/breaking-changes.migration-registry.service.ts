import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { nodeMigrations } from './migrations';
import type { NodeMigration } from './migrations/node-migration';

/**
 * Holds the node migrations, keyed by the breaking-change rule id that detects
 * the deprecated node. Detection (rules) and transformation (migrations) stay
 * decoupled: a rule can exist with no migration, in which case the report falls
 * back to prose recommendations.
 */
@Service()
export class MigrationRegistry {
	private readonly migrations = new Map<string, NodeMigration>();

	constructor(private readonly logger: Logger) {
		this.logger = logger.scoped('breaking-changes');
	}

	registerAll(): void {
		for (const migration of nodeMigrations) {
			if (this.migrations.has(migration.ruleId)) {
				this.logger.warn(
					`Migration for rule ${migration.ruleId} is already registered. Overwriting.`,
				);
			}
			this.migrations.set(migration.ruleId, migration);
		}
	}

	get(ruleId: string): NodeMigration | undefined {
		return this.migrations.get(ruleId);
	}

	has(ruleId: string): boolean {
		return this.migrations.has(ruleId);
	}
}
