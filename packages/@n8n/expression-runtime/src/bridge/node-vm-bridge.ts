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
		// Load runtime bundle
		const runtimePath = path.join(__dirname, '../../dist/bundle/runtime.iife.js');
		const runtimeCode = fs.readFileSync(runtimePath, 'utf-8');

		// Create context once and reuse it across all evaluations
		// TODO: Remove console access for production - security risk (data leakage, environment probing)
		// Consider making it conditional on debug flag: this.config.debug ? { console } : {}
		const sandbox = {
			console,
			__workflowData: {}, // Placeholder, will be updated per execution
		};
		this.context = vm.createContext(sandbox);

		// Load runtime bundle once into the context
		vm.runInContext(runtimeCode, this.context, {
			timeout: this.config.timeout,
			displayErrors: true,
		});
	}

	// TODO: Implement proper cache management to prevent unbounded growth
	// Options to consider:
	// - LRU cache with size limit
	// - Cache per execution instance (dispose with execution)
	// - Execution-scoped cache passed from caller
	// - Periodic cache cleanup based on usage patterns
	private scriptCache = new Map<string, vm.Script>();

	execute(code: string, data: Record<string, unknown>): unknown {
		if (!this.context) throw new Error('Not initialized');

		// Update workflow data for this execution (reuse existing context)
		this.context.__workflowData = data;

		// Cache compiled scripts
		const scriptKey = `__n8nExecute(${JSON.stringify(code)})`;
		let script = this.scriptCache.get(scriptKey);
		if (!script) {
			script = new vm.Script(scriptKey, { filename: 'expression.js' });
			this.scriptCache.set(scriptKey, script);
		}

		// Execute expression code
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
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
