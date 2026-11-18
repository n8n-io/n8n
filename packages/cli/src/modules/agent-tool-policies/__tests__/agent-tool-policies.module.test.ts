import { testModules } from '@n8n/backend-test-utils';
import { ModuleMetadata, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

describe('AgentToolPoliciesModule', () => {
	it('loads by its module name and registers the tool call check on init', async () => {
		// This file must not import the check. Only the module's `init()` may register it.
		await testModules.loadModules(['agent-tool-policies']);
		const moduleClass = Container.get(ModuleMetadata).get('agent-tool-policies')?.class;
		const checkNames = () =>
			Container.get(PolicyCheckMetadata)
				.getClasses()
				.map((checkClass) => checkClass.name);
		expect(moduleClass).toBeDefined();
		expect(checkNames()).not.toContain('ToolCallLogCheck');

		await Container.get(moduleClass!).init?.();

		expect(checkNames()).toContain('ToolCallLogCheck');
	});
});
