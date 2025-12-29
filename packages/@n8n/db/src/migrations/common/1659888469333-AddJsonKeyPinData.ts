import { isObjectLiteral } from '@n8n/backend-common';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import type { MigrationContext, IrreversibleMigration } from '../migration-types';

type OldPinnedData = { [nodeName: string]: IDataObject[] };
type NewPinnedData = { [nodeName: string]: INodeExecutionData[] };
type Workflow = { id: number; pinData: string | OldPinnedData };

function isJsonKeyObject(item: unknown): item is {
	json: unknown;
	[keys: string]: unknown;
} {
	if (!isObjectLiteral(item)) return false;
	return Object.keys(item).includes('json');
}

/**
 * Convert TEXT-type `pinData` column in `workflow_entity` table from
 * `{ [nodeName: string]: IDataObject[] }` to `{ [nodeName: string]: INodeExecutionData[] }`
 */
export class AddJsonKeyPinData1659888469333 implements IrreversibleMigration {
	async up({ escape, runQuery, runInBatches }: MigrationContext) {
		const tableName = escape.tableName('workflow_entity');
		const columnName = escape.columnName('pinData');

		const selectQuery = `SELECT id, ${columnName} FROM ${tableName} WHERE ${columnName} IS NOT NULL`;
		await runInBatches<Workflow>(selectQuery, async (workflows) => {
			await Promise.all(
				this.makeUpdateParams(workflows).map(
					async (workflow) =>
						await runQuery(`UPDATE ${tableName} SET ${columnName} = :pinData WHERE id = :id;`, {
							pinData: workflow.pinData,
							id: workflow.id,
						}),
				),
			);
		});
	}

	private makeUpdateParams(fetchedWorkflows: Workflow[]) {
		return fetchedWorkflows.reduce<Workflow[]>((updateParams, { id, pinData: rawPinData }) => {
			let pinDataPerWorkflow: OldPinnedData | NewPinnedData;

			if (typeof rawPinData === 'string') {
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					pinDataPerWorkflow = JSON.parse(rawPinData);
				} catch {
					pinDataPerWorkflow = {};
				}
			} else {
				pinDataPerWorkflow = rawPinData;
			}

			const newPinDataPerWorkflow = Object.keys(pinDataPerWorkflow).reduce<NewPinnedData>(
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
		}, []);
	}
}
