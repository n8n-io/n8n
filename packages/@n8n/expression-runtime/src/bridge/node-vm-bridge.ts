import * as vm from 'node:vm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RuntimeBridge, BridgeConfig, WorkflowDataProxy } from '../types';

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
		// Create VM context
		// TODO: Remove console access for production - security risk (data leakage, environment probing)
		// Consider making it conditional on debug flag: this.config.debug ? { console } : {}
		const sandbox = { console };
		this.context = vm.createContext(sandbox);

		// Load and execute runtime bundle
		const runtimePath = path.join(__dirname, '../bundle/runtime.iife.js');
		const runtimeCode = fs.readFileSync(runtimePath, 'utf-8');

		vm.runInContext(runtimeCode, this.context, {
			timeout: this.config.timeout,
			displayErrors: true,
		});
	}

	async execute(code: string, data: WorkflowDataProxy): Promise<unknown> {
		if (!this.context) throw new Error('Not initialized');

		// Serialize data for passing to VM
		const serializedData = this.serializeData(data);

		// Execute via __n8nExecute
		const script = new vm.Script(
			`__n8nExecute(${JSON.stringify(code)}, ${JSON.stringify(serializedData)})`,
			{ filename: 'expression.js' },
		);

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

	private serializeData(data: WorkflowDataProxy): any {
		// Convert proxy to plain object
		return {
			$json: data.get('$json'),
			$items: data.get('$items'),
			$input: data.get('$input'),
		};
	}
}
