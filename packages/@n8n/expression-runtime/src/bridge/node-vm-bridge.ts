import * as vm from 'node:vm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RuntimeBridge, BridgeConfig } from '../types';

export class NodeVmBridge implements RuntimeBridge {
	private context: vm.Context | null = null;

	private disposed = false;

	private config: Required<BridgeConfig>;

	constructor(config: BridgeConfig = {}) {
		this.config = {
			memoryLimit: config.memoryLimit ?? 128,
			timeout: config.timeout ?? 5000,
			debug: config.debug ?? false,
		};
	}

	async initialize(): Promise<void> {
		// Load runtime bundle (context will be created per-execution)
		const runtimePath = path.join(__dirname, '../../dist/bundle/runtime.iife.js');
		this.runtimeCode = fs.readFileSync(runtimePath, 'utf-8');
	}

	private runtimeCode?: string;

	async execute(code: string, data: Record<string, unknown>): Promise<unknown> {
		if (!this.runtimeCode) throw new Error('Not initialized');

		// Create fresh context with workflow data for each execution
		// TODO: Remove console access for production - security risk (data leakage, environment probing)
		// Consider making it conditional on debug flag: this.config.debug ? { console } : {}
		const sandbox = {
			console,
			__workflowData: data, // Pass workflow data proxy directly
		};
		this.context = vm.createContext(sandbox);

		// Load runtime bundle into context
		vm.runInContext(this.runtimeCode, this.context, {
			timeout: this.config.timeout,
			displayErrors: true,
		});

		// Execute expression code
		const script = new vm.Script(`__n8nExecute(${JSON.stringify(code)})`, {
			filename: 'expression.js',
		});

		return script.runInContext(this.context, {
			timeout: this.config.timeout,
			displayErrors: true,
		});
	}

	getDataSync(_path: string): unknown {
		// Not used in Slice 1 (no lazy loading)
		return undefined;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.context = null;
		this.runtimeCode = undefined;
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
