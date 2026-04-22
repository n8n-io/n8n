import type {
	ProviderStatus,
	WorkspaceSandbox,
	BaseSandboxOptions,
	CommandResult,
	ExecuteCommandOptions,
	SandboxProcessManager,
} from '../types';

/**
 * Shell-quote an argument for safe interpolation into a shell command string.
 * Safe characters (alphanumeric, `.`, `_`, `-`, `/`, `=`, `:`, `@`) pass through.
 * Everything else is wrapped in single quotes with embedded quotes escaped.
 */
export function shellQuote(arg: string): string {
	if (/^[a-zA-Z0-9._\-/=:@]+$/.test(arg)) return arg;
	return `'${arg.replace(/'/g, "'\\''")}'`;
}

export abstract class BaseSandbox implements WorkspaceSandbox {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly provider: string;
	status: ProviderStatus = 'pending';
	readonly processes?: SandboxProcessManager;

	private startPromise?: Promise<void>;
	private stopPromise?: Promise<void>;
	private destroyPromise?: Promise<void>;

	private readonly onStartHook?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	private readonly onStopHook?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	private readonly onDestroyHook?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;

	constructor(options?: BaseSandboxOptions) {
		if (options?.processes) {
			(this as { processes: SandboxProcessManager }).processes = options.processes;
		}
		this.onStartHook = options?.onStart;
		this.onStopHook = options?.onStop;
		this.onDestroyHook = options?.onDestroy;
	}

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
	abstract destroy(): Promise<void>;

	async _start(): Promise<void> {
		if (this.status === 'running') return;

		if (this.stopPromise) await this.stopPromise;
		if (this.destroyPromise) await this.destroyPromise;

		if (this.status === 'destroyed') {
			throw new Error('Cannot start a destroyed sandbox');
		}

		if (this.startPromise) return await this.startPromise;

		this.startPromise = this.executeStart();
		try {
			await this.startPromise;
		} finally {
			this.startPromise = undefined;
		}
	}

	async _stop(): Promise<void> {
		if (this.status === 'stopped' || this.status === 'pending') return;
		if (this.status === 'destroyed' || this.status === 'destroying') return;

		if (this.startPromise) await this.startPromise.catch(() => {});

		if (this.stopPromise) return await this.stopPromise;

		this.stopPromise = this.executeStop();
		try {
			await this.stopPromise;
		} finally {
			this.stopPromise = undefined;
		}
	}

	async _destroy(): Promise<void> {
		if (this.status === 'destroyed') return;

		if (this.status === 'pending') {
			this.status = 'destroyed';
			return;
		}

		if (this.startPromise) await this.startPromise.catch(() => {});
		if (this.stopPromise) await this.stopPromise.catch(() => {});

		if (this.destroyPromise) return await this.destroyPromise;

		this.destroyPromise = this.executeDestroy();
		try {
			await this.destroyPromise;
		} finally {
			this.destroyPromise = undefined;
		}
	}

	async ensureRunning(): Promise<void> {
		if (this.status === 'destroyed') {
			throw new Error(`Sandbox "${this.name}" has been destroyed`);
		}
		if (this.status === 'destroying') {
			if (this.destroyPromise) await this.destroyPromise.catch(() => {});
			throw new Error(`Sandbox "${this.name}" has been destroyed`);
		}
		if (this.status === 'stopping') {
			if (this.stopPromise) await this.stopPromise.catch(() => {});
		}
		if (this.status !== 'running') {
			await this._start();
		}
		if (this.status !== 'running') {
			throw new Error(`Sandbox "${this.name}" failed to start (status: ${this.status})`);
		}
	}

	async executeCommand(
		command: string,
		args?: string[],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		if (!this.processes) {
			throw new Error(`Sandbox "${this.name}" has no process manager`);
		}
		const fullCommand = args?.length ? `${command} ${args.map(shellQuote).join(' ')}` : command;
		const handle = await this.processes.spawn(fullCommand, options);
		return await handle.wait({
			onStdout: options?.onStdout,
			onStderr: options?.onStderr,
		});
	}

	getInstructions(): string {
		return '';
	}

	private async executeStart(): Promise<void> {
		this.status = 'starting';
		try {
			await this.start();
			this.status = 'running';
			try {
				await this.onStartHook?.({ sandbox: this });
			} catch {
				// Non-fatal: bad callback shouldn't kill a healthy sandbox
			}
		} catch (error) {
			this.status = 'error';
			throw error;
		}
	}

	private async executeStop(): Promise<void> {
		this.status = 'stopping';
		try {
			await this.onStopHook?.({ sandbox: this });
		} catch {
			// Non-fatal
		}
		try {
			await this.stop();
			this.status = 'stopped';
		} catch (error) {
			this.status = 'error';
			throw error;
		}
	}

	private async executeDestroy(): Promise<void> {
		this.status = 'destroying';
		try {
			await this.onDestroyHook?.({ sandbox: this });
		} catch {
			// Non-fatal
		}
		try {
			await this.destroy();
			this.status = 'destroyed';
		} catch (error) {
			this.status = 'error';
			throw error;
		}
	}
}
