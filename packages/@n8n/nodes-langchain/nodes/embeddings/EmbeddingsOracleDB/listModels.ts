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
		const normalizedFilter = filter?.trim().toUpperCase() ?? '';
		const sql = `
			SELECT model_name
			FROM user_mining_models
			${normalizedFilter ? 'WHERE INSTR(UPPER(model_name), :modelNameFilter) > 0' : ''}
			ORDER BY model_name
		`;
		const binds = normalizedFilter ? { modelNameFilter: normalizedFilter } : {};

		const result = await connection.execute<MiningModelRow>(sql, binds);

		const rows = (result.rows ?? []).filter(
			(row): row is MiningModelRow => Array.isArray(row) && typeof row[0] === 'string',
		);

		const models = rows.map(([modelName]) => ({
			name: modelName,
			value: modelName,
		}));

		return { results: models };
	} finally {
		await connection.close();
	}
}
