import { VariablesService } from '@/environments/variables/variables.service.ee';
import { mockInstance } from '../shared/mocking';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { getBase } from '@/WorkflowExecuteAdditionalData';
import Container from 'typedi';
import { CredentialsHelper } from '@/CredentialsHelper';
import { SecretsHelper } from '@/SecretsHelpers';

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
