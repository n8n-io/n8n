import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { NodeContractStatus, NodeContractVersion } from '../entities';
import { BaseRepository } from './base-repository';
import { TransactionRunner } from '../services/transaction';

/** A stored version without its bundle and fixtures. */
export type NodeContractManifestRow = Pick<
	NodeContractVersion,
	'digest' | 'contractId' | 'version' | 'kind' | 'manifest' | 'signatures' | 'origin'
>;

/** A new version. The database sets `createdAt`. */
export type NewNodeContractVersion = Omit<NodeContractVersion, 'createdAt'>;

@Service()
export class NodeContractVersionRepository extends BaseRepository<NodeContractVersion> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(NodeContractVersion, dataSource.manager, transactionRunner);
	}

	/** The stored versions of one contract id, or of every id, without the large columns. */
	async findManifests(contractId?: string): Promise<NodeContractManifestRow[]> {
		return await this.find({
			select: ['digest', 'contractId', 'version', 'kind', 'manifest', 'signatures', 'origin'],
			where: contractId === undefined ? {} : { contractId },
		});
	}

	/** The stored credential manifests, without the large columns. */
	async findCredentialManifests(): Promise<NodeContractManifestRow[]> {
		return await this.find({
			select: ['digest', 'contractId', 'version', 'kind', 'manifest', 'signatures', 'origin'],
			where: { kind: 'credential' },
		});
	}

	/** Whether a version with this manifest digest is stored. */
	async existsByDigest(digest: string): Promise<boolean> {
		return await this.existsBy({ digest });
	}

	/** The bundle of a stored version, or `null` when the version has none or is not stored. */
	async findBundle(digest: string): Promise<string | null> {
		const row = await this.findOne({ select: ['digest', 'bundle'], where: { digest } });
		return row?.bundle ?? null;
	}

	/** Every stored version with all of its columns. */
	async findAllForExport(): Promise<NodeContractVersion[]> {
		return await this.find();
	}

	/** Inserts the versions in one transaction. It skips each digest and id@version that it has. */
	async insertNew(versions: readonly NewNodeContractVersion[]) {
		await this.runInTransaction({}, async (tx) => {
			for (const version of versions) {
				await tx
					.createQueryBuilder()
					.insert()
					.into(NodeContractVersion)
					.values(version)
					.orIgnore()
					.execute();
			}
		});
	}
}

@Service()
export class NodeContractStatusRepository extends BaseRepository<NodeContractStatus> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(NodeContractStatus, dataSource.manager, transactionRunner);
	}

	/** The status lines of one contract id, or of every id. */
	async findLines(contractId?: string): Promise<string[]> {
		const rows = await this.find({
			select: ['digest', 'line'],
			where: contractId === undefined ? {} : { contractId },
			order: { createdAt: 'ASC', digest: 'ASC' },
		});
		return rows.map(({ line }) => line);
	}

	/** Inserts the status lines in one transaction. It skips each digest that it has. */
	async insertNew(
		statuses: ReadonlyArray<Pick<NodeContractStatus, 'digest' | 'contractId' | 'line'>>,
	) {
		await this.runInTransaction({}, async (tx) => {
			for (const status of statuses) {
				await tx
					.createQueryBuilder()
					.insert()
					.into(NodeContractStatus)
					.values(status)
					.orIgnore()
					.execute();
			}
		});
	}
}
