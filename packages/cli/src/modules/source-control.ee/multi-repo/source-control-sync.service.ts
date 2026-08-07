import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import * as path from 'node:path';

import { FsPackageReader } from '@/modules/n8n-packages/io/fs/fs-package-reader';
import { FsPackageWriter } from '@/modules/n8n-packages/io/fs/fs-package-writer';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import type { ImportRequestOptions } from '@/modules/n8n-packages/n8n-packages.types';

import type { ConnectionPushResult, ConnectionStatus } from './multi-repo.types';
import type { SourceControlConnection } from './source-control-connection.entity';
import { SourceControlConnectionService } from './source-control-connection.service';

/**
 * Sync-shaped import profile: id-preserving upserts that converge the instance
 * to the repo state, mirroring v1 source control semantics (stubs for
 * credentials, activation state preserved).
 */
const SYNC_IMPORT_PROFILE: Omit<ImportRequestOptions, 'user'> = {
	workflowIdPolicy: 'source',
	workflowConflictPolicy: 'new-version',
	workflowPublishingPolicy: 'preserve-published-state',
	missingNodeTypeMode: 'import-anyway',
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'create-stub',
	folderConflictPolicy: 'merge',
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: 'create',
	dataTableSchemaConflictPolicy: 'keep-existing',
	variableMissingMode: 'create-with-value',
	tagMissingMode: 'create',
	tagConflictPolicy: 'rename',
};

@Service()
export class SourceControlSyncService {
	constructor(
		private readonly connectionService: SourceControlConnectionService,
		private readonly n8nPackagesService: N8nPackagesService,
		private readonly logger: Logger,
	) {}

	async push(
		connectionId: string,
		user: User,
		commitMessage?: string,
	): Promise<ConnectionPushResult> {
		const connection = await this.connectionService.get(connectionId);
		const git = await this.connectionService.gitFor(connection);

		await git.fetch();
		await this.exportToWorkDir(connection, user);

		const pushedFiles = await git.diffVsRemote(connection.branchName);
		const { commitHash } = await git.addAllCommitPush(
			commitMessage ?? 'Updated workfolder',
			connection.branchName,
		);

		return { commitHash, pushedFiles };
	}

	async pull(connectionId: string, user: User) {
		const connection = await this.connectionService.get(connectionId);
		const git = await this.connectionService.gitFor(connection);
		const workDir = this.connectionService.workDirFor(connection.id);

		await git.fetch();
		await git.resetToRemote(connection.branchName);

		if (!existsSync(path.join(workDir, 'manifest.json'))) {
			this.logger.info('Pull skipped: repository has no package manifest yet', { connectionId });
			return null;
		}

		const reader = new FsPackageReader(workDir);
		const manifest = await reader.readManifest();
		if (!manifest.projects?.length) {
			this.logger.info('Pull skipped: package contains no projects', { connectionId });
			return null;
		}

		return await this.n8nPackagesService.importFromReader({ user, ...SYNC_IMPORT_PROFILE }, reader);
	}

	async status(connectionId: string, user: User): Promise<ConnectionStatus> {
		const connection = await this.connectionService.get(connectionId);
		const git = await this.connectionService.gitFor(connection);

		await git.fetch();
		await this.exportToWorkDir(connection, user);

		const files = await git.diffVsRemote(connection.branchName);
		return { branchName: connection.branchName, files };
	}

	/** Wipe-and-re-export so renames and deletions surface as plain git diffs. */
	private async exportToWorkDir(connection: SourceControlConnection, user: User): Promise<void> {
		const workDir = this.connectionService.workDirFor(connection.id);
		if (existsSync(workDir)) {
			for (const entry of readdirSync(workDir)) {
				if (entry === '.git') continue;
				rmSync(path.join(workDir, entry), { recursive: true, force: true });
			}
		}

		const projectIds = await this.connectionService.resolveOwnedProjectIds(connection.id);
		if (projectIds.length === 0) {
			this.logger.info('Nothing to export: connection owns no projects', {
				connectionId: connection.id,
			});
			return;
		}

		await this.n8nPackagesService.exportPackage(
			{
				user,
				projectIds,
				includeVariableValues: true,
				canExportVariableValues: true,
				missingWorkflowDependencyPolicy: 'reference-only',
				pathStyle: 'id',
			},
			new FsPackageWriter(workDir),
		);
	}
}
