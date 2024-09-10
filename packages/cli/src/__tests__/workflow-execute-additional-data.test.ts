import { VariablesService } from '@/environments/variables/variables.service.ee';
import { mockInstance } from '@test/mocking';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { getBase } from '@/workflow-execute-additional-data';
import Container from 'typedi';
import { CredentialsHelper } from '@/credentials-helper';
import { SecretsHelper } from '@/secrets-helpers';

describe('WorkflowExecuteAdditionalData', () => {
	const messageEventBus = mockInstance(MessageEventBus);
	const variablesService = mockInstance(VariablesService);
	variablesService.getAllCached.mockResolvedValue([]);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const secretsHelper = mockInstance(SecretsHelper);
	Container.set(MessageEventBus, messageEventBus);
	Container.set(VariablesService, variablesService);
	Container.set(CredentialsHelper, credentialsHelper);
	Container.set(SecretsHelper, secretsHelper);

	test('logAiEvent should call MessageEventBus', async () => {
		const additionalData = await getBase('user-id');

		const eventName = 'n8n.ai.memory.get.messages';
		const payload = {
			msg: 'test message',
			executionId: '123',
			nodeName: 'n8n-memory',
			workflowId: 'workflow-id',
			workflowName: 'workflow-name',
			nodeType: 'n8n-memory',
		};

		await additionalData.logAiEvent(eventName, payload);

		expect(messageEventBus.sendAiNodeEvent).toHaveBeenCalledTimes(1);
		expect(messageEventBus.sendAiNodeEvent).toHaveBeenCalledWith({
			eventName,
			payload,
		});
	});
});
