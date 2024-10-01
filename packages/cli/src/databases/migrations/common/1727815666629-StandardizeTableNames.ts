import type { MigrationContext } from '@/databases/types';

export class StandardizeTableNames1727815666629 {
	async up({ escape, runQuery }: MigrationContext) {
		const tableNameMap = {
			annotation_tag_entity: 'annotation_tag',
			credentials_entity: 'credential',
			event_destinations: 'event_destination',
			execution_annotation_tags: 'execution_annotation_tag',
			execution_annotations: 'execution_annotation',
			execution_entity: 'execution',
			installed_nodes: 'installed_node',
			installed_packages: 'installed_package',
			settings: 'setting',
			shared_credentials: 'shared_credential',
			tag_entity: 'tag',
			user_api_keys: 'user_api_key',
			variables: 'variable',
			webhook_entity: 'webhook',
			workflow_entity: 'workflow',
			workflows_tags: 'workflow_tag',
		} as const;

		await Promise.all(
			Object.keys(tableNameMap).map(async (oldTableName) => {
				const newTableName = tableNameMap[oldTableName as keyof typeof tableNameMap];
				return await runQuery(
					`ALTER TABLE ${escape.tableName(oldTableName)} RENAME TO ${escape.tableName(newTableName)}`,
				);
			}),
		);
	}
}
