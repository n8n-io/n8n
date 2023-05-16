/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-use-before-define */
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { MigrationContext, IrreversibleMigration } from '@db/types';
import { runInBatches, escapeQuery } from '@db/utils/migrationHelpers';

/**
 * Convert TEXT-type `pinData` column in `workflow_entity` table from
 * `{ [nodeName: string]: IDataObject[] }` to `{ [nodeName: string]: INodeExecutionData[] }`
 */
export class AddJsonKeyPinData1659888469333 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { queryRunner, tablePrefix } = context;
		const workflowTable = `${tablePrefix}workflow_entity`;

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
			addJsonKeyToPinDataColumn(context, PINDATA_UPDATE_STATEMENT),
		);
	}
}

namespace PinData {
	export type Old = { [nodeName: string]: IDataObject[] };

	export type New = { [nodeName: string]: INodeExecutionData[] };

	export type FetchedWorkflow = { id: number; pinData: string | Old };
}

function isObjectLiteral(maybeObject: unknown): maybeObject is { [key: string]: string } {
	return typeof maybeObject === 'object' && maybeObject !== null && !Array.isArray(maybeObject);
}

function isJsonKeyObject(item: unknown): item is {
	json: unknown;
	[keys: string]: unknown;
} {
	if (!isObjectLiteral(item)) return false;
	return Object.keys(item).includes('json');
}

export const addJsonKeyToPinDataColumn =
	({ queryRunner }: MigrationContext, updateStatement: string) =>
	async (fetchedWorkflows: PinData.FetchedWorkflow[]) => {
		await Promise.all(
			makeUpdateParams(fetchedWorkflows).map(async (param) => {
				const params = {
					pinData: param.pinData,
					id: param.id,
				};

				const [escapedStatement, escapedParams] = escapeQuery(queryRunner, updateStatement, params);
				return queryRunner.query(escapedStatement, escapedParams);
			}),
		);
	};

function makeUpdateParams(fetchedWorkflows: PinData.FetchedWorkflow[]) {
	return fetchedWorkflows.reduce<PinData.FetchedWorkflow[]>(
		(updateParams, { id, pinData: rawPinData }) => {
			let pinDataPerWorkflow: PinData.Old | PinData.New;

			if (typeof rawPinData === 'string') {
				try {
					pinDataPerWorkflow = JSON.parse(rawPinData);
				} catch {
					pinDataPerWorkflow = {};
				}
			} else {
				pinDataPerWorkflow = rawPinData;
			}

			const newPinDataPerWorkflow = Object.keys(pinDataPerWorkflow).reduce<PinData.New>(
				// eslint-disable-next-line @typescript-eslint/no-shadow
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
