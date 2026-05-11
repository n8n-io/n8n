import { randomUUID } from 'node:crypto';

import { callLifecycle } from './lifecycle';
import { createWorkspaceTools } from './tools/workspace-tools';
import type {
	WorkspaceConfig,
	WorkspaceFilesystem,
	WorkspaceSandbox,
	ProviderStatus,
} from './types';
import type { BuiltTool } from '../types/sdk/tool';

export class Workspace {
	readonly id: string;
	readonly name: string;

	private _status: ProviderStatus = 'pending';
	private filesystemInstance?: WorkspaceFilesystem;
	private sandboxInstance?: WorkspaceSandbox;

	private initPromise?: Promise<void>;
	private destroyPromise?: Promise<void>;

	constructor(config: WorkspaceConfig) {
		this.id = config.id ?? `workspace-${randomUUID()}`;
		this.name = config.name ?? `workspace-${this.id}`;
		this.filesystemInstance = config.filesystem;
		this.sandboxInstance = config.sandbox;
	}

	get status(): ProviderStatus {
		return this._status;
	}

	get filesystem(): WorkspaceFilesystem | undefined {
		return this.filesystemInstance;
	}

	get sandbox(): WorkspaceSandbox | undefined {
		return this.sandboxInstance;
	}

	async init(): Promise<void> {
		if (this._status === 'ready') return;
		if (this._status === 'destroyed') {
			throw new Error(`Workspace "${this.id}" has been destroyed and cannot be re-initialized`);
		}
		if (this.initPromise) return await this.initPromise;
		this._status = 'initializing';

		this.initPromise = this.performInit();
		try {
			await this.initPromise;
		} finally {
			this.initPromise = undefined;
		}
	}

	async destroy(): Promise<void> {
		if (this.destroyPromise) return await this.destroyPromise;

		// Wait for any in-progress init before destroying to avoid concurrent
		// lifecycle execution and inconsistent final status.
		if (this.initPromise) {
			try {
				await this.initPromise;
			} catch {
				// Init failed; proceed with destruction anyway
			}
		}

		this.destroyPromise = this.performDestroy();
		try {
			await this.destroyPromise;
		} finally {
			this.destroyPromise = undefined;
		}
	}

	getInstructions(): string {
		const parts: string[] = [];
		if (this.sandboxInstance?.getInstructions) {
			const instructions = this.sandboxInstance.getInstructions();
			if (instructions) parts.push(instructions);
		}
		if (this.filesystemInstance?.getInstructions) {
			const instructions = this.filesystemInstance.getInstructions();
			if (instructions) parts.push(instructions);
		}
		return parts.join('\n\n');
	}

	getTools(): BuiltTool[] {
		return createWorkspaceTools(this);
	}

	private async performInit(): Promise<void> {
		try {
			if (this.filesystemInstance) {
				await callLifecycle(this.filesystemInstance, 'init');
			}
			if (this.sandboxInstance) {
				await callLifecycle(this.sandboxInstance, 'start');
			}
		} catch (error) {
			if (this.filesystemInstance) {
				try {
					await callLifecycle(this.filesystemInstance, 'destroy');
				} catch {
					// Best-effort cleanup — original error is re-thrown below
				}
			}
			if (this.sandboxInstance) {
				try {
					await callLifecycle(this.sandboxInstance, 'destroy');
				} catch {
					// Best-effort cleanup — original error is re-thrown below
				}
			}
			this._status = 'error';
			throw error;
		}
		this._status = 'ready';
	}

	private async performDestroy(): Promise<void> {
		let firstError: unknown;

		if (this.sandboxInstance) {
			try {
				await callLifecycle(this.sandboxInstance, 'destroy');
			} catch (error) {
				firstError = error;
			}
		}

		if (this.filesystemInstance) {
			try {
				await callLifecycle(this.filesystemInstance, 'destroy');
			} catch (error) {
				firstError ??= error;
			}
		}

		this._status = 'destroyed';

		if (firstError) {
			this._status = 'error';
			throw firstError as Error;
		}
	}
}
