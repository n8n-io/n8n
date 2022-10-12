import {
	getTablePrefix,
	logMigrationEnd,
	logMigrationStart,
	runInBatches,
} from '../../utils/migrationHelpers';
import { addJsonKeyToPinDataColumn } from '../sqlite/1659888469333-AddJsonKeyPinData';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Convert JSON-type `pinData` column in `workflow_entity` table from
 * `{ [nodeName: string]: IDataObject[] }` to `{ [nodeName: string]: INodeExecutionData[] }`
 */
export class AddJsonKeyPinData1659902242948 implements MigrationInterface {
	name = 'AddJsonKeyPinData1659902242948';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const workflowTable = `${getTablePrefix()}workflow_entity`;

		const PINDATA_SELECT_QUERY = `
			SELECT id, "pinData"
			FROM ${workflowTable}
			WHERE "pinData" IS NOT NULL;
		`;

		const PINDATA_UPDATE_STATEMENT = `
			UPDATE ${workflowTable}
			SET "pinData" = :pinData
			WHERE id = :id;
		`;

		await runInBatches(
			queryRunner,
			PINDATA_SELECT_QUERY,
			addJsonKeyToPinDataColumn(queryRunner, PINDATA_UPDATE_STATEMENT),
		);

		logMigrationEnd(this.name);
	}

	async down() {
		// irreversible migration
	}
}
