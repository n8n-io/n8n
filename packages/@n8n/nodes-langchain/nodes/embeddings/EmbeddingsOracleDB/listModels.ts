import { configureOracleDB } from 'n8n-nodes-base/dist/nodes/Oracle/Sql/transport';
import type { OracleDBNodeCredentials } from 'n8n-nodes-base/nodes/Oracle/Sql/helpers/interfaces';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

type MiningModelRow = [string];

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter = '',
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('oracleDBApi');
	const pool = await configureOracleDB.call(this, credentials as OracleDBNodeCredentials);
	const connection = await pool.getConnection();

	try {
		const result = await connection.execute<MiningModelRow>(
			'select model_name from user_mining_models',
		);

		const rows = (result.rows ?? []).filter(
			(row): row is MiningModelRow => Array.isArray(row) && typeof row[0] === 'string',
		);

		const normalizedFilter = filter.trim().toLowerCase();

		const models = rows
			.filter(([modelName]) =>
				normalizedFilter ? modelName.toLowerCase().includes(normalizedFilter) : true,
			)
			.map(([modelName]) => ({
				name: modelName,
				value: modelName,
			}));

		return { results: models };
	} finally {
		await connection.close();
	}
}
