import { assertDir } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { jsonParse, jsonStringify } from 'n8n-workflow';
import fs from 'node:fs/promises';
import path from 'node:path';

import { EXECUTION_DATA_BUNDLE_FILENAME, EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import { CorruptedExecutionDataError } from './corrupted-execution-data.error';
import { ExecutionDataWriteError } from './execution-data-write.error';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

@Service()
export class FsStore implements ExecutionDataStore {
	constructor(
		private readonly storageConfig: StorageConfig,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		await assertDir(this.storageConfig.storagePath);
	}

	async write(ref: ExecutionRef, payload: ExecutionDataPayload) {
		const writePath = this.resolveBundlePath(ref);
		await assertDir(path.dirname(writePath));

		// for atomicity, first write to temp file and then rename
		const tempPath = `${writePath}.tmp.${Date.now()}`;
		let success = false;

		try {
			await fs.writeFile(
				tempPath,
				jsonStringify({ ...payload, version: EXECUTION_DATA_BUNDLE_VERSION }),
				'utf-8',
			);
			await fs.rename(tempPath, writePath);
			success = true;
		} catch (error) {
			throw new ExecutionDataWriteError(ref, error);
		} finally {
			if (!success)
				await fs.rm(tempPath, { force: true }).catch((e) => this.errorReporter.error(e));
		}
	}

	async read(ref: ExecutionRef) {
		const bundlePath = this.resolveBundlePath(ref);

		let content: string;

		try {
			content = await fs.readFile(bundlePath, 'utf-8');
		} catch (error) {
			if (this.isFileNotFound(error)) return null;
			throw error;
		}

		try {
			return jsonParse<ExecutionDataBundle>(content);
		} catch (error) {
			throw new CorruptedExecutionDataError(ref, error);
		}
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		const refs = Array.isArray(ref) ? ref : [ref];

		await Promise.all(
			refs.map(
				async (r) => await fs.rm(this.resolveExecutionDir(r), { recursive: true, force: true }),
			),
		);
	}

	private resolveExecutionDir({ workflowId, executionId }: ExecutionRef) {
		return path.join(
			this.storageConfig.storagePath,
			'workflows',
			workflowId,
			'executions',
			executionId,
		);
	}

	private resolveBundlePath(ref: ExecutionRef) {
		return path.join(
			this.resolveExecutionDir(ref),
			'execution_data',
			EXECUTION_DATA_BUNDLE_FILENAME,
		);
	}

	private isFileNotFound(error: unknown): error is NodeJS.ErrnoException {
		return (
			error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
		);
	}
}
