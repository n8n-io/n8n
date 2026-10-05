vi.mock('../mock-handler', () => ({
	createLlmMockHandler: vi.fn(() => vi.fn()),
}));
vi.mock('@/workflow-execute-additional-data', () => ({ getBase: vi.fn() }));

import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, User } from '@n8n/db';
import type { CredentialsFinderService } from '@n8n/backend-services';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { ICredentialsHelper, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import { getBase } from '@/workflow-execute-additional-data';

import {
	configureEvalMockRun,
	designTimeMockContext,
	designTimeScenarioHints,
	EvalDesignTimeMockService,
} from '../design-time-mock.service';
import { EvalMockedCredentialsHelper } from '../eval-mocked-credentials-helper';
import { createLlmMockHandler } from '../mock-handler';
import { EvalThreadCredentialAllowlistService } from '../thread-credential-allowlist.service';

describe('EvalDesignTimeMockService', () => {
	const request = 'Sync the Deals database (Deal ID, Stage) to a sheet';
	let allowlists: EvalThreadCredentialAllowlistService;
	let service: EvalDesignTimeMockService;

	beforeEach(() => {
		vi.mocked(createLlmMockHandler).mockImplementation(() => vi.fn());
		allowlists = new EvalThreadCredentialAllowlistService();
		service = new EvalDesignTimeMockService(allowlists);
	});

	it('gives no mock to a thread that the harness did not pin', async () => {
		const userRequests = vi.fn(async () => request);

		expect(await service.handlerFor('thread-1', userRequests)).toBeUndefined();
		expect(userRequests).not.toHaveBeenCalled();
	});

	it('mocks a pinned thread with the user request as context', async () => {
		allowlists.set('thread-1', []);

		expect(await service.handlerFor('thread-1', async () => request)).toBeDefined();
		expect(createLlmMockHandler).toHaveBeenCalledWith({
			globalContext: designTimeMockContext(request),
		});
		expect(designTimeMockContext(request)).toContain('Deal ID, Stage');
	});

	it('keeps one mock for each thread until the thread is cleared', async () => {
		allowlists.set('thread-1', []);
		const userRequests = vi.fn(async () => request);

		const first = await service.handlerFor('thread-1', userRequests);
		expect(await service.handlerFor('thread-1', userRequests)).toBe(first);
		expect(userRequests).toHaveBeenCalledTimes(1);

		service.clearThread('thread-1');
		expect(await service.handlerFor('thread-1', userRequests)).not.toBe(first);
	});

	it('gives the mock the data setups of the case scenarios', async () => {
		allowlists.set('thread-1', []);
		const scenarios = [
			{ name: 'found', dataSetup: 'GET https://api.example.com/users returns {"ids":[1,2]}' },
			{ name: 'down', dataSetup: 'GET https://api.example.com/users returns 503' },
		];
		service.setScenarios('thread-1', scenarios);

		await service.handlerFor('thread-1', async () => request);

		const scenarioHints = designTimeScenarioHints(scenarios);
		expect(createLlmMockHandler).toHaveBeenCalledWith({
			globalContext: designTimeMockContext(request),
			scenarioHints,
		});
		expect(scenarioHints).toContain(
			'- found: GET https://api.example.com/users returns {"ids":[1,2]}',
		);
		expect(scenarioHints).toContain('- down: GET https://api.example.com/users returns 503');
		expect(scenarioHints).toContain('first scenario that describes a successful response');
	});

	it('builds the next mock of a thread from scenarios that arrive later', async () => {
		allowlists.set('thread-1', []);
		const first = await service.handlerFor('thread-1', async () => request);

		service.setScenarios('thread-1', [{ name: 'found', dataSetup: 'one user' }]);

		expect(await service.handlerFor('thread-1', async () => request)).not.toBe(first);
		expect(createLlmMockHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({ scenarioHints: expect.stringContaining('one user') }),
		);
	});

	it('mocks without context when the request cannot be read', async () => {
		allowlists.set('thread-1', []);

		await service.handlerFor('thread-1', async () => await Promise.reject(new Error('no memory')));

		expect(createLlmMockHandler).toHaveBeenCalledWith({ globalContext: '' });
	});
});

describe('configureEvalMockRun', () => {
	it('sends the HTTP of a run to the mock and tolerates missing credentials', () => {
		const handler: EvalLlmMockHandler = vi.fn();
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			credentialsHelper: mock<ICredentialsHelper>(),
		});

		configureEvalMockRun(handler, mock<Logger>())(additionalData);

		expect(additionalData.evalLlmMockHandler).toBe(handler);
		expect(additionalData.credentialsHelper).toBeInstanceOf(EvalMockedCredentialsHelper);
	});
});

describe('design-time lookups through NodeResourceExplorerService', () => {
	const params = {
		nodeType: 'n8n-nodes-base.notion',
		version: 2.2,
		methodName: 'getFilterProperties',
		methodType: 'loadOptions' as const,
		credentialType: 'notionApi',
		credentialId: 'cred-1',
	};

	const setUp = () => {
		const dynamicNodeParameters = mock<DynamicNodeParametersService>();
		const credentialsFinder = mock<CredentialsFinderService>();
		const projects = mock<ProjectRepository>();
		credentialsFinder.findCredentialForUser.mockResolvedValue({
			id: 'cred-1',
			type: 'notionApi',
			name: '[eval] Notion',
		} as never);
		projects.getPersonalProjectForUserOrFail.mockResolvedValue({ id: 'proj-1' } as never);
		dynamicNodeParameters.getOptionsViaMethodName.mockResolvedValue([
			{ name: 'Deal ID', value: 'Deal ID|rich_text' },
		]);
		const nodeTypes = mock<NodeTypes>();
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('Unknown node type');
		});
		const explorer = new NodeResourceExplorerService(
			mock<Logger>(),
			dynamicNodeParameters,
			credentialsFinder,
			projects,
			nodeTypes,
		);
		return { explorer, dynamicNodeParameters };
	};

	const additionalDataOfLookup = (dynamicNodeParameters: DynamicNodeParametersService) =>
		vi.mocked(dynamicNodeParameters.getOptionsViaMethodName).mock.calls[0]?.[2];

	it('answers the load-options HTTP of an eval thread with the mock', async () => {
		vi.mocked(getBase).mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());
		const { explorer, dynamicNodeParameters } = setUp();
		const handler: EvalLlmMockHandler = vi.fn();

		const result = await explorer.exploreResources(mock<User>(), params, handler);

		expect(result.results).toEqual([
			{ name: 'Deal ID', value: 'Deal ID|rich_text', description: undefined },
		]);
		expect(additionalDataOfLookup(dynamicNodeParameters)?.evalLlmMockHandler).toBe(handler);
	});

	it('leaves the load-options HTTP alone outside an eval thread', async () => {
		vi.mocked(getBase).mockResolvedValue({} as IWorkflowExecuteAdditionalData);
		const { explorer, dynamicNodeParameters } = setUp();

		await explorer.exploreResources(mock<User>(), params);

		expect(additionalDataOfLookup(dynamicNodeParameters)).not.toHaveProperty('evalLlmMockHandler');
	});
});
