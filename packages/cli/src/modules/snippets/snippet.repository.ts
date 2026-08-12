import { Service } from '@n8n/di';
import { DataSource, Repository, type EntityManager } from '@n8n/typeorm';

import { Snippet } from './snippet.entity';

@Service()
export class SnippetRepository extends Repository<Snippet> {
	constructor(dataSource: DataSource) {
		super(Snippet, dataSource.manager);
	}

	async findAllWithProject(): Promise<Snippet[]> {
		return await this.find({ relations: ['project'] });
	}

	async transferAllByProjectId(fromProjectId: string, toProjectId: string, trx?: EntityManager) {
		if (fromProjectId === toProjectId) return;
		const em = trx ?? this.manager;

		const snippets = await em.findBy(Snippet, { projectId: fromProjectId });
		for (const snippet of snippets) {
			// Names must stay valid JS identifiers, so clashes get a numeric suffix
			let name = snippet.name;
			let suffix = 2;
			while (await em.existsBy(Snippet, { name, projectId: toProjectId })) {
				name = `${snippet.name}_${suffix++}`;
			}
			await em.update(Snippet, { id: snippet.id }, { name, projectId: toProjectId });
		}
	}

	async deleteAllByProjectId(projectId: string) {
		await this.delete({ projectId });
	}
}
