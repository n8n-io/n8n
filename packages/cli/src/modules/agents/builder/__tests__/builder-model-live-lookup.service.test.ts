import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';

import { BuilderModelLiveLookupService } from '../builder-model-live-lookup.service';
import type { ModelLookupConfig } from '../interactive/llm-provider-defaults';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn().mockResolvedValue({}),
}));

const user = mock<User>({ id: 'user-1' });
const projectId = 'project-1';

const listSearchLookup: ModelLookupConfig = {
	kind: 'listSearch',
	nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
	version: 1.5,
	methodName: 'searchModels',
};

function makeService() {
	const credentialsService = mock<CredentialsService>();
	const dynamicNodeParametersService = mock<DynamicNodeParametersService>();
	const nodeTypes = mock<NodeTypes>();
	const service = new BuilderModelLiveLookupService(
		credentialsService,
		dynamicNodeParametersService,
		nodeTypes,
	);
	return { service, credentialsService, dynamicNodeParametersService, nodeTypes };
}

describe('BuilderModelLiveLookupService', () => {
	it('lists models for a credential the user can use in the project', async () => {
		const { service, credentialsService, dynamicNodeParametersService } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi' },
		] as Awaited<ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>>);
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }],
		});

		const result = await service.list(user, projectId, 'cred-1', 'anthropicApi', listSearchLookup);

		expect(result).toEqual([{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }]);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId,
		});
	});

	it('rejects a credential that is not available in the project', async () => {
		const { service, credentialsService, dynamicNodeParametersService } = makeService();
		// The user can read this credential, but it is not in the project's set.
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
			[] as Awaited<ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>>,
		);

		await expect(
			service.list(user, projectId, 'cred-other-project', 'anthropicApi', listSearchLookup),
		).rejects.toThrow('not found or not accessible');
		expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
	});

	it('rejects a credential whose type does not match the provider', async () => {
		const { service, credentialsService, dynamicNodeParametersService } = makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'cred-1', name: 'My OpenAI', type: 'openAiApi' },
		] as Awaited<ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>>);

		await expect(
			service.list(user, projectId, 'cred-1', 'anthropicApi', listSearchLookup),
		).rejects.toThrow('not found or not accessible');
		expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
	});
});
