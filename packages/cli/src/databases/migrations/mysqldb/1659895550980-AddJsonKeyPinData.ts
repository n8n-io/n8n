import type { MigrationContext, IrreversibleMigration } from '@db/types';
import { runInBatches } from '@db/utils/migrationHelpers';
import { addJsonKeyToPinDataColumn } from '../sqlite/1659888469333-AddJsonKeyPinData';

/**
 * Convert JSON-type `pinData` column in `workflow_entity` table from
 * `{ [nodeName: string]: IDataObject[] }` to `{ [nodeName: string]: INodeExecutionData[] }`
 */
export class AddJsonKeyPinData1659895550980 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { queryRunner, tablePrefix } = context;
		const workflowTable = `${tablePrefix}workflow_entity`;

		const PINDATA_SELECT_QUERY = `
			SELECT id, pinData
			FROM \`${workflowTable}\`
			WHERE pinData IS NOT NULL;
		`;

		const PINDATA_UPDATE_STATEMENT = `
			UPDATE \`${workflowTable}\`
			SET \`pinData\` = :pinData
			WHERE id = :id;
		`;

		await runInBatches(
			queryRunner,
			PINDATA_SELECT_QUERY,
			addJsonKeyToPinDataColumn(context, PINDATA_UPDATE_STATEMENT),
		);
	}
}
