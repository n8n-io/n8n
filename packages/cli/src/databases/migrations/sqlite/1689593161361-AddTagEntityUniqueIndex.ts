import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddTagEntityUniqueIndex1689593161361 implements ReversibleMigration {
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
	}

	async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}8f949d7a3a984759044054e89b"`);
	}
}
