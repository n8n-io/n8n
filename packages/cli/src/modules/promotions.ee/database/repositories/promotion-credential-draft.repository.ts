import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, LessThan } from '@n8n/typeorm';

import { PromotionCredentialDraft } from '../entities/promotion-credential-draft.entity';

class PromotionCredentialDraftTable extends BaseRepository<PromotionCredentialDraft> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionCredentialDraft, dataSource.manager, transactionRunner);
	}
}

export type CredentialDraftRow = Pick<
	PromotionCredentialDraft,
	'projectId' | 'sourceCredentialId' | 'name' | 'data' | 'updatedById'
>;

/** Prototype. The drafts of the credentials that an Apply creates from the branch. */
@Service()
export class PromotionCredentialDraftRepository {
	private readonly table: PromotionCredentialDraftTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PromotionCredentialDraftTable(dataSource, transactionRunner);
	}

	async findByProject(projectId: string): Promise<PromotionCredentialDraft[]> {
		return await this.table.find({ where: { projectId } });
	}

	async upsertDraft(row: CredentialDraftRow): Promise<void> {
		await this.table.upsert(row, ['projectId', 'sourceCredentialId']);
	}

	async deleteDrafts(projectId: string, sourceCredentialIds: string[]): Promise<void> {
		if (sourceCredentialIds.length === 0) return;
		await this.table.delete({ projectId, sourceCredentialId: In(sourceCredentialIds) });
	}

	async deleteOlderThan(projectId: string, cutoff: Date): Promise<void> {
		await this.table.delete({ projectId, updatedAt: LessThan(cutoff) });
	}
}
