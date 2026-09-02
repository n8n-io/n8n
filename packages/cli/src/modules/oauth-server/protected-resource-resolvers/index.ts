import { Container } from '@n8n/di';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { FormTriggerTestResourceResolver } from './form-trigger-test-resource.resolver';
import { FormTriggerResourceResolver } from './form-trigger-resource.resolver';
import { WorkflowMcpTestTriggerResourceResolver } from './workflow-mcp-test-trigger-resource.resolver';
import { WorkflowMcpTriggerResourceResolver } from './workflow-mcp-trigger-resource.resolver';
import { WorkflowWebhookTestTriggerResourceResolver } from './workflow-webhook-test-trigger-resource.resolver';
import { WorkflowWebhookTriggerResourceResolver } from './workflow-webhook-trigger-resource.resolver';

export function registerProtectedResourceResolvers() {
	Container.get(ProtectedResourceRegistry).registerResolver(
		Container.get(WorkflowMcpTriggerResourceResolver),
	);
	Container.get(ProtectedResourceRegistry).registerResolver(
		Container.get(WorkflowMcpTestTriggerResourceResolver),
	);
	Container.get(ProtectedResourceRegistry).registerResolver(
		Container.get(FormTriggerResourceResolver),
	);
	Container.get(ProtectedResourceRegistry).registerResolver(
		Container.get(FormTriggerTestResourceResolver),
	);
	Container.get(ProtectedResourceRegistry).registerResolver(
		Container.get(WorkflowWebhookTriggerResourceResolver),
	);
	Container.get(ProtectedResourceRegistry).registerResolver(
		Container.get(WorkflowWebhookTestTriggerResourceResolver),
	);
}
