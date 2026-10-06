import { join as posixJoin, normalize as posixNormalize } from 'node:path/posix';

import { Workspace, type WorkspaceFilesystem, type WorkspaceSandbox } from '@n8n/agents';
import { UserError } from 'n8n-workflow';

export function sessionOutputDir(sessionId: string): string {
	return `outputs/${sessionId}`;
}

export function absoluteSessionOutputDir(workspaceRoot: string, sessionId: string): string {
	return posixJoin(workspaceRoot, sessionOutputDir(sessionId));
}

export function sessionOutputInstruction(workspaceRoot: string, sessionId: string): string {
	return `Write files the user should retrieve only under \`${absoluteSessionOutputDir(workspaceRoot, sessionId)}\`. Files anywhere else are Scratch Files and are not retrievable.`;
}

const MIME_BY_EXT: Record<string, string> = {
	md: 'text/markdown',
	txt: 'text/plain',
	json: 'application/json',
	csv: 'text/csv',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	pdf: 'application/pdf',
};

export function mimeTypeForOutputFileName(fileName: string): string {
	const dot = fileName.lastIndexOf('.');
	const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
	return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

function isInside(path: string, root: string): boolean {
	const boundary = root.endsWith('/') ? root : `${root}/`;
	return path === root || path.startsWith(boundary);
}

export function resolveParentOutputPath(
	path: string,
	workspaceRoot: string,
	sessionId: string,
	scopedRoot: string,
): string | null {
	const outputAbs = absoluteSessionOutputDir(workspaceRoot, sessionId);
	const outputRel = sessionOutputDir(sessionId);
	const normalized = posixNormalize(path);
	if (path.startsWith('/')) {
		return isInside(normalized, outputAbs) ? normalized : null;
	}
	if (normalized === outputRel || normalized.startsWith(`${outputRel}/`)) {
		return posixJoin(workspaceRoot, normalized);
	}
	const fromScoped = posixNormalize(posixJoin(scopedRoot, normalized));
	return isInside(fromScoped, outputAbs) ? fromScoped : null;
}

export function relativeOutputFileName(absolutePath: string, outputAbs: string): string {
	if (absolutePath === outputAbs) return '';
	const prefix = outputAbs.endsWith('/') ? outputAbs : `${outputAbs}/`;
	return absolutePath.startsWith(prefix) ? absolutePath.slice(prefix.length) : '';
}

export interface SessionOutputSyncHost {
	sync(params: {
		sessionId: string;
		writerId: string;
		filesystem: WorkspaceFilesystem;
		workspaceRoot: string;
		mutatedOutputFileName?: string;
	}): Promise<{ errors: string[]; mutatedError?: string }>;
}

export interface WrapSessionOutputsOptions {
	sessionId: string;
	workspaceRoot: string;
	scopedRoot: string;
	parentFilesystem: WorkspaceFilesystem;
	writerId: string;
	host: SessionOutputSyncHost;
}

class OutputCopyFilesystem implements WorkspaceFilesystem {
	constructor(
		private readonly inner: WorkspaceFilesystem,
		private readonly options: WrapSessionOutputsOptions,
	) {}

	get id() {
		return this.inner.id;
	}

	get name() {
		return this.inner.name;
	}

	get provider() {
		return this.inner.provider;
	}

	get status() {
		return this.inner.status;
	}

	set status(status) {
		this.inner.status = status;
	}

	get readOnly() {
		return this.inner.readOnly;
	}

	get basePath() {
		return this.inner.basePath;
	}

	getInstructions(): string {
		const base = this.inner.getInstructions?.() ?? '';
		return [base, sessionOutputInstruction(this.options.workspaceRoot, this.options.sessionId)]
			.filter(Boolean)
			.join('\n');
	}

	init = this.inner.init?.bind(this.inner);
	destroy = this.inner.destroy?.bind(this.inner);
	_init = this.inner._init?.bind(this.inner);
	_destroy = this.inner._destroy?.bind(this.inner);
	getMountConfig = this.inner.getMountConfig?.bind(this.inner);

	async readFile(...args: Parameters<WorkspaceFilesystem['readFile']>) {
		return await this.inner.readFile(...args);
	}

	async exists(...args: Parameters<WorkspaceFilesystem['exists']>) {
		return await this.inner.exists(...args);
	}

	async stat(...args: Parameters<WorkspaceFilesystem['stat']>) {
		return await this.inner.stat(...args);
	}

	async readdir(...args: Parameters<WorkspaceFilesystem['readdir']>) {
		return await this.inner.readdir(...args);
	}

	async mkdir(...args: Parameters<WorkspaceFilesystem['mkdir']>) {
		return await this.inner.mkdir(...args);
	}

	async writeFile(
		path: string,
		content: Parameters<WorkspaceFilesystem['writeFile']>[1],
		options?: Parameters<WorkspaceFilesystem['writeFile']>[2],
	) {
		await this.mutate(path, true, async (target) => {
			if (target) await this.options.parentFilesystem.writeFile(target, content, options);
			else await this.inner.writeFile(path, content, options);
		});
	}

	async appendFile(
		path: string,
		content: Parameters<WorkspaceFilesystem['appendFile']>[1],
		options?: Parameters<WorkspaceFilesystem['appendFile']>[2],
	) {
		await this.mutate(path, true, async (target) => {
			if (target) await this.options.parentFilesystem.appendFile(target, content, options);
			else await this.inner.appendFile(path, content, options);
		});
	}

	async deleteFile(path: string, options?: Parameters<WorkspaceFilesystem['deleteFile']>[1]) {
		await this.mutate(path, false, async (target) => {
			if (target) await this.options.parentFilesystem.deleteFile(target, options);
			else await this.inner.deleteFile(path, options);
		});
	}

	async rmdir(path: string, options?: Parameters<WorkspaceFilesystem['rmdir']>[1]) {
		await this.mutate(path, false, async (target) => {
			if (target) await this.options.parentFilesystem.rmdir(target, options);
			else await this.inner.rmdir(path, options);
		});
	}

	async copyFile(
		src: string,
		dest: string,
		options?: Parameters<WorkspaceFilesystem['copyFile']>[2],
	) {
		await this.mutate(dest, true, async (target) => {
			if (target) {
				const srcTarget = resolveParentOutputPath(
					src,
					this.options.workspaceRoot,
					this.options.sessionId,
					this.options.scopedRoot,
				);
				await this.options.parentFilesystem.copyFile(srcTarget ?? src, target, options);
			} else await this.inner.copyFile(src, dest, options);
		});
	}

	async moveFile(
		src: string,
		dest: string,
		options?: Parameters<WorkspaceFilesystem['moveFile']>[2],
	) {
		await this.mutate(dest, true, async (target) => {
			if (target) {
				const srcTarget = resolveParentOutputPath(
					src,
					this.options.workspaceRoot,
					this.options.sessionId,
					this.options.scopedRoot,
				);
				await this.options.parentFilesystem.moveFile(srcTarget ?? src, target, options);
			} else await this.inner.moveFile(src, dest, options);
		});
	}

	private async mutate(
		path: string,
		throwOnMutatedFailure: boolean,
		run: (parentAbs: string | null) => Promise<void>,
	): Promise<void> {
		const parentAbs = resolveParentOutputPath(
			path,
			this.options.workspaceRoot,
			this.options.sessionId,
			this.options.scopedRoot,
		);
		await run(parentAbs);
		const outputAbs = absoluteSessionOutputDir(this.options.workspaceRoot, this.options.sessionId);
		const mutatedOutputFileName = parentAbs
			? relativeOutputFileName(parentAbs, outputAbs)
			: undefined;
		const { mutatedError } = await this.options.host.sync({
			sessionId: this.options.sessionId,
			writerId: this.options.writerId,
			filesystem: this.options.parentFilesystem,
			workspaceRoot: this.options.workspaceRoot,
			mutatedOutputFileName,
		});
		if (throwOnMutatedFailure && mutatedError) throw new UserError(mutatedError);
	}
}

function wrapSandbox(
	sandbox: WorkspaceSandbox,
	options: WrapSessionOutputsOptions,
): WorkspaceSandbox {
	const innerExecute = sandbox.executeCommand?.bind(sandbox);
	const innerInstructions = sandbox.getInstructions?.bind(sandbox);
	sandbox.getInstructions = () =>
		[
			innerInstructions?.() ?? '',
			sessionOutputInstruction(options.workspaceRoot, options.sessionId),
		]
			.filter(Boolean)
			.join('\n');
	if (!innerExecute) return sandbox;
	sandbox.executeCommand = async (command, args, commandOptions) => {
		let result: Awaited<ReturnType<NonNullable<WorkspaceSandbox['executeCommand']>>> | undefined;
		try {
			result = await innerExecute(command, args, commandOptions);
			return result;
		} finally {
			const { errors } = await options.host.sync({
				sessionId: options.sessionId,
				writerId: options.writerId,
				filesystem: options.parentFilesystem,
				workspaceRoot: options.workspaceRoot,
			});
			if (result && errors.length > 0) {
				result.stderr = [result.stderr, ...errors].filter(Boolean).join('\n');
			}
		}
	};
	return sandbox;
}

export function wrapWorkspaceForSessionOutputs(
	workspace: Workspace,
	options: WrapSessionOutputsOptions,
): Workspace {
	const filesystem = workspace.filesystem
		? new OutputCopyFilesystem(workspace.filesystem, options)
		: undefined;
	const sandbox = workspace.sandbox ? wrapSandbox(workspace.sandbox, options) : undefined;
	return new Workspace({
		id: workspace.id,
		name: workspace.name,
		filesystem,
		sandbox,
	});
}
