import {
	logMigrationStart,
	logMigrationEnd,
	runInBatches,
	getTablePrefix,
	escapeQuery,
} from '../../utils/migrationHelpers';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { isJsonKeyObject, PinData } from '../../utils/migrations.types';

/**
 * Convert TEXT-type `pinData` column in `workflow_entity` table from
 * `{ [nodeName: string]: IDataObject[] }` to `{ [nodeName: string]: INodeExecutionData[] }`
 */
export class AddJsonKeyPinData1659888469333 implements MigrationInterface {
	name = 'AddJsonKeyPinData1659888469333';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);

		const workflowTable = `${getTablePrefix()}workflow_entity`;

		const PINDATA_SELECT_QUERY = `
			SELECT id, pinData
			FROM "${workflowTable}"
			WHERE pinData IS NOT NULL;
		`;

		const PINDATA_UPDATE_STATEMENT = `
			UPDATE "${workflowTable}"
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

export const addJsonKeyToPinDataColumn =
	(queryRunner: QueryRunner, updateStatement: string) =>
	async (fetchedWorkflows: PinData.FetchedWorkflow[]) => {
		makeUpdateParams(fetchedWorkflows).forEach((param) => {
			const params = {
				pinData: param.pinData,
				id: param.id,
			};

			const [escapedStatement, escapedParams] = escapeQuery(queryRunner, updateStatement, params);

			queryRunner.query(escapedStatement, escapedParams);
		});
	};

function makeUpdateParams(fetchedWorkflows: PinData.FetchedWorkflow[]) {
	return fetchedWorkflows.reduce<PinData.FetchedWorkflow[]>(
		(updateParams, { id, pinData: rawPinData }) => {
			let pinDataPerWorkflow: PinData.Old | PinData.New;

			if (typeof rawPinData === 'string') {
				try {
					pinDataPerWorkflow = JSON.parse(rawPinData);
				} catch (_) {
					pinDataPerWorkflow = {};
				}
			} else {
				pinDataPerWorkflow = rawPinData;
			}

			const newPinDataPerWorkflow = Object.keys(pinDataPerWorkflow).reduce<PinData.New>(
				(newPinDataPerWorkflow, nodeName) => {
					let pinDataPerNode = pinDataPerWorkflow[nodeName];

					if (!Array.isArray(pinDataPerNode)) {
						pinDataPerNode = [pinDataPerNode];
					}

					if (pinDataPerNode.every((item) => item.json)) return newPinDataPerWorkflow;

					newPinDataPerWorkflow[nodeName] = pinDataPerNode.map((item) =>
						isJsonKeyObject(item) ? item : { json: item },
					);

					return newPinDataPerWorkflow;
				},
				{},
			);

			if (Object.keys(newPinDataPerWorkflow).length > 0) {
				updateParams.push({ id, pinData: JSON.stringify(newPinDataPerWorkflow) });
			}

			return updateParams;
		},
		[],
	);
}
