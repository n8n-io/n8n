import type { PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import type { IDataObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import * as ts from 'typescript';

import {
	analyzeCodeString,
	createTracedInstance,
	type ClassMetadata,
	type StaticGraph,
} from '@n8n/code-engine';

import { parseBody } from '@/middlewares/body-parser';
import { Push } from '@/push';

import type {
	IWebhookManager,
	IWebhookResponseCallbackData,
	WebhookAccessControlOptions,
	WebhookRequest,
} from './webhook.types';

interface PendingWebhook {
	pushRef: string;
	timeout: NodeJS.Timeout;
	compiledCode: string;
	httpMethodPath: string;
	metadata: ClassMetadata;
}

const WEBHOOK_TIMEOUT_MS = 120_000; // 2 minutes

@Service()
export class CodeEngineWebhooks implements IWebhookManager {
	private pendingWebhooks = new Map<string, PendingWebhook>();

	constructor(
		private readonly push: Push,
		private readonly logger: Logger,
	) {}

	async registerTestWebhook(
		code: string,
		pushRef: string,
	): Promise<{ testWebhookPath: string; staticGraph: StaticGraph }> {
		const staticGraph = analyzeCodeString(code);
		const compiledCode = this.transpileCode(code);

		// Find the first trigger node to get the HTTP path
		const triggerNode = staticGraph.nodes.find((n) => n.type === 'trigger');
		if (!triggerNode?.path || !triggerNode.method) {
			throw new Error('No HTTP trigger found in code');
		}

		// Build ClassMetadata from the static graph
		const metadata = this.buildMetadataFromGraph(staticGraph);

		const uuid = randomUUID();
		const testWebhookPath = `${uuid}${triggerNode.path}`;

		const timeout = setTimeout(() => {
			this.cancelWebhook(testWebhookPath, pushRef);
		}, WEBHOOK_TIMEOUT_MS);

		this.pendingWebhooks.set(testWebhookPath, {
			pushRef,
			timeout,
			compiledCode,
			httpMethodPath: triggerNode.path,
			metadata,
		});

		return { testWebhookPath, staticGraph };
	}

	async findAccessControlOptions(): Promise<WebhookAccessControlOptions> {
		return { allowedOrigins: '*' };
	}

	async executeWebhook(req: WebhookRequest, _res: Response): Promise<IWebhookResponseCallbackData> {
		const path = req.params.path;
		const pending = this.findPendingWebhook(path);

		if (!pending) {
			return { responseCode: 404, data: { error: 'Webhook not found' } as IDataObject };
		}

		const { pushRef, compiledCode, httpMethodPath, metadata } = pending.value;

		// Webhook handlers run before the global bodyParser middleware,
		// so we must parse the body ourselves.
		await parseBody(req);

		try {
			const result = await this.executeWithTracing(
				compiledCode,
				httpMethodPath,
				{ body: req.body, query: req.query },
				pushRef,
				metadata,
			);

			this.removePendingWebhook(pending.key);

			return { responseCode: 200, data: result as IDataObject };
		} catch (error) {
			this.removePendingWebhook(pending.key);
			const message = error instanceof Error ? error.message : String(error);
			const stack = error instanceof Error ? error.stack : undefined;
			this.logger.error('Code engine webhook execution failed', { message, stack });
			return { responseCode: 500, data: { error: message } as IDataObject };
		}
	}

	private async executeWithTracing(
		compiledCode: string,
		httpMethodPath: string,
		requestData: { body: unknown; query: Record<string, unknown> },
		pushRef: string,
		metadata: ClassMetadata,
	): Promise<unknown> {
		this.logger.debug('Code engine: evaluating compiled code');
		const ClassConstructor = this.evalCode(compiledCode);
		this.logger.debug('Code engine: creating instance of user class');
		const instance = new ClassConstructor();
		const { proxy, getTrace } = createTracedInstance(instance, metadata, {
			onNodeEnter: (nodeId, meta, args) => {
				this.push.send(
					{
						type: 'codeEngineNodeBefore',
						data: { nodeId, label: meta.description, input: args },
					} as PushMessage,
					pushRef,
				);
			},
			onNodeExit: (nodeId, meta, output, durationMs, error) => {
				this.push.send(
					{
						type: 'codeEngineNodeAfter',
						data: { nodeId, label: meta.description, output, durationMs, error },
					} as PushMessage,
					pushRef,
				);
			},
		});

		// Find the trigger method
		const triggerMethod = metadata.httpMethods.find((m) => m.path === httpMethodPath);
		if (!triggerMethod) {
			throw new Error(`No handler found for path ${httpMethodPath}`);
		}

		try {
			const handler = proxy[triggerMethod.propertyKey];
			if (typeof handler !== 'function') {
				throw new Error(`Method ${triggerMethod.propertyKey} is not a function on the instance`);
			}
			const result = await (handler as (req: unknown) => unknown)(requestData);

			const trace = getTrace();
			this.push.send({ type: 'codeEngineFinished', data: { trace } } as PushMessage, pushRef);

			return result;
		} catch (error) {
			const trace = getTrace();
			this.push.send({ type: 'codeEngineFinished', data: { trace } } as PushMessage, pushRef);
			throw error;
		}
	}

	private buildMetadataFromGraph(graph: StaticGraph): ClassMetadata {
		return {
			controller: { basePath: '' },
			httpMethods: graph.nodes
				.filter((n) => n.type === 'trigger' && n.method && n.path)
				.map((n) => ({
					method: n.method as ClassMetadata['httpMethods'][number]['method'],
					path: n.path!,
					propertyKey: n.id,
				})),
			callables: graph.nodes
				.filter((n) => n.type === 'callable')
				.map((n) => ({
					description: n.label,
					propertyKey: n.id,
				})),
		};
	}

	private transpileCode(code: string): string {
		const result = ts.transpileModule(code, {
			compilerOptions: {
				target: ts.ScriptTarget.ES2021,
				module: ts.ModuleKind.CommonJS,
				experimentalDecorators: true,
				emitDecoratorMetadata: false,
			},
		});

		if (result.diagnostics && result.diagnostics.length > 0) {
			const errors = result.diagnostics.map((d) =>
				ts.flattenDiagnosticMessageText(d.messageText, '\n'),
			);
			throw new Error(`Compilation failed: ${errors.join(', ')}`);
		}

		return result.outputText;
	}

	private evalCode(compiledCode: string): new (...args: unknown[]) => Record<string, unknown> {
		// TODO: This uses `new Function()` which gives user code full access to the
		// Node.js runtime (file system, network, child_process, etc.). Before any
		// broader rollout, replace with a sandboxed execution environment (e.g.
		// isolated-vm, worker threads with restricted permissions, or a container).
		//
		// Capture the class via the Controller decorator so we don't require
		// the user code to export the class explicitly.
		let capturedClass: unknown;
		const controllerDecorator = () => (target: unknown) => {
			capturedClass = target;
			return target;
		};
		const noopMethodDecorator =
			() => (_target: unknown, _key: string, _desc: PropertyDescriptor) => {};
		const noopCallable = (_desc: string) => (_target: unknown, _key: string) => {};

		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const factory = new Function(
			'Controller',
			'POST',
			'GET',
			'PUT',
			'DELETE',
			'PATCH',
			'Callable',
			'exports',
			compiledCode,
		);

		const exports = {};
		factory(
			controllerDecorator,
			noopMethodDecorator,
			noopMethodDecorator,
			noopMethodDecorator,
			noopMethodDecorator,
			noopMethodDecorator,
			noopCallable,
			exports,
		);

		if (typeof capturedClass !== 'function') {
			throw new Error(
				'No class with @Controller decorator found in the provided code. ' +
					'Make sure your code defines a class decorated with @Controller.',
			);
		}

		return capturedClass as new (
			...args: unknown[]
		) => Record<string, unknown>;
	}

	hasPendingWebhook(path: string): boolean {
		return this.pendingWebhooks.has(path);
	}

	private findPendingWebhook(path: string): { key: string; value: PendingWebhook } | undefined {
		const pending = this.pendingWebhooks.get(path);
		if (pending) return { key: path, value: pending };
		return undefined;
	}

	private removePendingWebhook(key: string): void {
		const pending = this.pendingWebhooks.get(key);
		if (pending) {
			clearTimeout(pending.timeout);
			this.pendingWebhooks.delete(key);
		}
	}

	private cancelWebhook(path: string, pushRef: string): void {
		this.logger.debug(`Code engine webhook timed out: ${path}`);
		this.push.send({ type: 'codeEngineWebhookDeleted', data: {} } as PushMessage, pushRef);
		this.removePendingWebhook(path);
	}
}
