import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Workflow Rules: admin-defined rules on workflow content. Opt-in while it is built:
 * set `N8N_ENABLED_MODULES=workflow-rules`.
 */
@BackendModule({ name: 'workflow-rules' })
export class WorkflowRulesModule implements ModuleInterface {
	async init() {
		// Side effects: the decorators register the controllers and the policy check.
		await import('./workflow-rules.controller.js');
		await import('./workflow-rules-project.controller.js');
		await import('./workflow-rules.policy-check.js');

		const { WorkflowRulesSnapshot } = await import('./workflow-rules.snapshot.js');
		await Container.get(WorkflowRulesSnapshot).start();
	}

	async entities() {
		const { WorkflowRuleSetEntity } = await import('./database/workflow-rule-set.entity.js');
		const { WorkflowRuleExemptionEntity } = await import(
			'./database/workflow-rule-exemption.entity.js'
		);
		return [WorkflowRuleSetEntity, WorkflowRuleExemptionEntity];
	}
}
