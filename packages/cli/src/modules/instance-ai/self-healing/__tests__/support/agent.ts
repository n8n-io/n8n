import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

function agentsTable() {
	return `${Container.get(GlobalConfig).database.tablePrefix}agents`;
}

/** Raw SQL, because Instance AI code must not import the entities of the agents module. */
export async function createAgentRow(projectId: string, name = 'Support agent') {
	const id = generateNanoId();
	await Container.get(DataSource)
		.createQueryBuilder()
		.insert()
		.into(agentsTable(), ['id', 'name', 'projectId'])
		.values({ id, name, projectId })
		.execute();
	return id;
}

export async function deleteAgentRow(id: string) {
	await Container.get(DataSource)
		.createQueryBuilder()
		.delete()
		.from(agentsTable())
		.where('id = :id', { id })
		.execute();
}
