import type { LicenseState, ModulesConfig } from '@n8n/backend-common';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { ContextEstablishmentHookMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';

import { ExecutionRedactionService } from '../executions/execution-redaction.service';
// For the @BackendModule side effect. Importing the hook here would void the assertion.
import '../redaction.module';

const moduleEntry = Container.get(ModuleMetadata).get('redaction');

/**
 * One test per file on purpose: ESM evaluates the hook's import once per process, so a
 * second init would observe the first one's registration and assert nothing. Each cli
 * test file gets its own fork, which keeps this init the first one.
 */
describe('RedactionModule hook registration', () => {
	it('registers RedactionContextHook as a global execution-context hook', async () => {
		mockInstance(Logger);
		Container.set(ExecutionRedactionService, mock<ExecutionRedactionService>());
		Container.set(ExecutionRedactionServiceProxy, mock<ExecutionRedactionServiceProxy>());

		const moduleMetadata = new ModuleMetadata();
		moduleMetadata.register('redaction', moduleEntry!);
		const registry = new ModuleRegistry(
			moduleMetadata,
			mock<LicenseState>(),
			mock<Logger>(),
			mock<ModulesConfig>(),
		);

		await registry.initModules('worker');

		const globalHooks = Container.get(ContextEstablishmentHookMetadata)
			.getGlobalClasses()
			.map((hookClass) => hookClass.name);

		expect(globalHooks).toContain('RedactionContextHook');
	});
});
