import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class FixMissingIndicesFromStringIdMigration1690000000020 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		const toMerge = (await queryRunner.query(
			`SELECT id, name, COUNT(*) c FROM ${tablePrefix}tag_entity GROUP BY name HAVING c > 1`,
		)) as Array<{ id: string; name: string }>;

		for (const m of toMerge) {
			const tags = (await queryRunner.query(
				`SELECT id FROM ${tablePrefix}tag_entity WHERE name = ?`,
				[m.name],
			)) as Array<{ id: string }>;
			for (const t of tags) {
				if (t.id === m.id) {
					continue;
				}
				await queryRunner.query(
					`UPDATE ${tablePrefix}workflows_tags SET tagId = ? WHERE tagId = ?`,
					[m.id, t.id],
				);
				await queryRunner.query(`DELETE FROM ${tablePrefix}tag_entity WHERE id = ?`, [t.id]);
			}
		}

		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b" ON "${tablePrefix}tag_entity" ("name") `,
		);

		await queryRunner.query(
			`CREATE INDEX 'IDX_${tablePrefix}b94b45ce2c73ce46c54f20b5f9' ON '${tablePrefix}execution_entity' ('waitTill', 'id');`,
		);
		await queryRunner.query(
			`CREATE INDEX 'IDX_${tablePrefix}81fc04c8a17de15835713505e4' ON '${tablePrefix}execution_entity' ('workflowId', 'id');`,
		);
		await queryRunner.query(
			`CREATE INDEX 'IDX_${tablePrefix}8b6f3f9ae234f137d707b98f3bf43584' ON '${tablePrefix}execution_entity' ('status', 'workflowId');`,
		);
	}
}
