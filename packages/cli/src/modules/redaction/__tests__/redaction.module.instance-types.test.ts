import type { LicenseState, ModulesConfig } from '@n8n/backend-common';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { INSTANCE_TYPES } from '@n8n/constants';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';

import { ExecutionRedactionService } from '../executions/execution-redaction.service';
// For the @BackendModule side effect.
import '../redaction.module';

// The decorator registers at import time, before any test can reset the container.
const moduleEntry = Container.get(ModuleMetadata).get('redaction');

/** Every instance type that can run a workflow must initialize the module. */
describe('RedactionModule instance-type eligibility', () => {
	let executionRedactionService: Mocked<ExecutionRedactionService>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockInstance(Logger);
		executionRedactionService = mock<ExecutionRedactionService>();
		executionRedactionService.init.mockResolvedValue(undefined);
		Container.set(ExecutionRedactionService, executionRedactionService);
		Container.set(ExecutionRedactionServiceProxy, mock<ExecutionRedactionServiceProxy>());
	});

	/** A registry holding only the redaction module, as the decorator registered it. */
	const buildRegistry = () => {
		const moduleMetadata = new ModuleMetadata();
		moduleMetadata.register('redaction', moduleEntry!);

		return new ModuleRegistry(
			moduleMetadata,
			mock<LicenseState>(),
			mock<Logger>(),
			mock<ModulesConfig>(),
		);
	};

	it('declares no instance-type restriction', () => {
		expect(moduleEntry).toBeDefined();
		expect(moduleEntry?.instanceTypes).toBeUndefined();
	});

	it.each(INSTANCE_TYPES)('initializes on a "%s" instance', async (instanceType) => {
		await buildRegistry().initModules(instanceType);

		expect(executionRedactionService.init).toHaveBeenCalledTimes(1);
	});
});
