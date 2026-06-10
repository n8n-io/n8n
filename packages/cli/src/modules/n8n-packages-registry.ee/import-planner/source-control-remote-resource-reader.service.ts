import type { SourceControlledFile } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UnexpectedError, jsonParse } from 'n8n-workflow';
import { readFile as fsReadFile } from 'node:fs/promises';

import type { IWorkflowToImport } from '@/interfaces';

import { RemoteResourceSet } from './import-planner.types';

@Service()
export class SourceControlRemoteResourceReader {
	async readSelectedResources(changes: SourceControlledFile[]): Promise<RemoteResourceSet> {
		const resources = new RemoteResourceSet();

		await Promise.all(
			changes.map(async (change) => {
				if (change.type !== 'workflow' || change.status === 'deleted') return;
				resources.workflows.set(change.id, await this.readWorkflow(change.file));
			}),
		);

		return resources;
	}

	private async readWorkflow(filePath: string): Promise<IWorkflowToImport> {
		try {
			return jsonParse<IWorkflowToImport>(await fsReadFile(filePath, { encoding: 'utf8' }));
		} catch (error) {
			throw new UnexpectedError(
				`Failed to parse workflow file ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`,
				{ cause: error },
			);
		}
	}
}
