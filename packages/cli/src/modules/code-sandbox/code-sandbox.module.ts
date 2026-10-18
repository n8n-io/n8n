import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Code node on the sandbox service (spike). Does nothing unless
 * N8N_CODE_EXECUTION_BACKEND=sandbox. The backend itself is called from
 * `startRunnerTask` in workflow-execute-additional-data.ts.
 */
@BackendModule({ name: 'code-sandbox' })
export class CodeSandboxModule implements ModuleInterface {
	async init() {
		const { CodeSandboxConfig } = await import('./code-sandbox.config.js');
		const config = Container.get(CodeSandboxConfig);
		if (!config.enabled) return;

		// Imported for its side effect: `@OnLifecycleEvent` registers on class definition.
		await import('./code-sandbox-lifecycle.js');
		Container.get(Logger).info('Code sandbox backend enabled for JavaScript Code tasks', {
			scope: config.scope,
			slots: config.slots,
			idleTimeoutMs: config.idleTimeoutMs,
			maxLifetimeMs: config.maxLifetimeMs,
			spareWorkers: config.spareWorkers,
			serviceUrl: config.serviceUrl,
		});
	}

	@OnShutdown()
	async shutdown() {
		const { CodeSandboxConfig } = await import('./code-sandbox.config.js');
		if (!Container.get(CodeSandboxConfig).enabled) return;
		const { SandboxLeaseManager } = await import('./sandbox-lease-manager.js');
		await Container.get(SandboxLeaseManager).shutdown();
	}
}
