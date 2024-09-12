import { VariablesService } from '@/environments/variables/variables.service.ee';
import { mockInstance } from '@test/mocking';
import { getBase } from '@/workflow-execute-additional-data';
import Container from 'typedi';
import { CredentialsHelper } from '@/credentials-helper';
import { SecretsHelper } from '@/secrets-helpers';
import { EventService } from '@/events/event.service';

describe('WorkflowExecuteAdditionalData', () => {
	const variablesService = mockInstance(VariablesService);
	variablesService.getAllCached.mockResolvedValue([]);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const secretsHelper = mockInstance(SecretsHelper);
	const eventService = mockInstance(EventService);
	Container.set(VariablesService, variablesService);
	Container.set(CredentialsHelper, credentialsHelper);
	Container.set(SecretsHelper, secretsHelper);

	test('logAiEvent should call MessageEventBus', async () => {
		const additionalData = await getBase('user-id');

		const eventName = 'ai-messages-retrieved-from-memory';
		const payload = {
			msg: 'test message',
			executionId: '123',
			nodeName: 'n8n-memory',
			workflowId: 'workflow-id',
			workflowName: 'workflow-name',
			nodeType: 'n8n-memory',
		};

		additionalData.logAiEvent(eventName, payload);

		expect(eventService.emit).toHaveBeenCalledTimes(1);
		expect(eventService.emit).toHaveBeenCalledWith(eventName, payload);
	});
});
