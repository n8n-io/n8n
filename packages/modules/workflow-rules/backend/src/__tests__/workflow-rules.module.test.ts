import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowRuleExemptionEntity } from '../database/workflow-rule-exemption.entity';
import { WorkflowRuleSetEntity } from '../database/workflow-rule-set.entity';
import { WorkflowRulesModule } from '../workflow-rules.module';

describe('WorkflowRulesModule', () => {
	it('registers the module entrypoint without a licence flag', () => {
		const metadata = Container.get(ModuleMetadata).get('workflow-rules');
		expect(metadata?.class).toBe(WorkflowRulesModule);
		expect(metadata?.licenseFlag).toBeUndefined();
	});

	it('owns the rule set and exemption entities', async () => {
		expect(await new WorkflowRulesModule().entities()).toEqual([
			WorkflowRuleSetEntity,
			WorkflowRuleExemptionEntity,
		]);
	});
});
