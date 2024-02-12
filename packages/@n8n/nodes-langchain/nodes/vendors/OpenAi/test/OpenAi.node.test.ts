import * as assistant from '../actions/assistant';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import * as transport from '../transport';

import get from 'lodash/get';

const createExecuteFunctionsMock = (parameters: IDataObject) => {
	const nodeParameters = parameters;
	return {
		getNodeParameter(parameter: string) {
			return get(nodeParameters, parameter);
		},
		getNode() {
			return {};
		},
	} as unknown as IExecuteFunctions;
};

describe('OpenAi, Assistant resource', () => {
	beforeEach(() => {
		(transport as any).apiRequest = jest.fn();
	});

	it('create => should throw an error if an assistant with the same name already exists', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			data: [{ name: 'name' }],
			has_more: false,
		});

		try {
			await assistant.create.execute.call(
				createExecuteFunctionsMock({
					name: 'name',
					options: {
						failIfExists: true,
					},
				}),
				0,
			);
			expect(true).toBe(false);
		} catch (error) {
			expect(error.message).toBe("An assistant with the same name 'name' already exists");
		}
	});

	it('create => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		await assistant.create.execute.call(
			createExecuteFunctionsMock({
				modelId: 'gpt-model',
				name: 'name',
				description: 'description',
				instructions: 'some instructions',
				codeInterpreter: true,
				knowledgeRetrieval: true,
				file_ids: [],
				options: {},
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/assistants', {
			body: {
				description: 'description',
				file_ids: [],
				instructions: 'some instructions',
				model: 'gpt-model',
				name: 'name',
				tools: [{ type: 'code_interpreter' }, { type: 'retrieval' }],
			},
			headers: { 'OpenAI-Beta': 'assistants=v1' },
		});
	});

	it('create => should throw error if more then 20 files selected', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		try {
			await assistant.create.execute.call(
				createExecuteFunctionsMock({
					file_ids: Array.from({ length: 25 }),
					options: {},
				}),
				0,
			);
			expect(true).toBe(false);
		} catch (error) {
			expect(error.message).toBe(
				'The maximum number of files that can be attached to the assistant is 20',
			);
		}
	});

	it('delete => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		await assistant.deleteAssistant.execute.call(
			createExecuteFunctionsMock({
				assistantId: 'assistant-id',
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledWith('DELETE', '/assistants/assistant-id', {
			headers: { 'OpenAI-Beta': 'assistants=v1' },
		});
	});

	it('list => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			data: [
				{ name: 'name1', id: 'id-1', model: 'gpt-model', other: 'other' },
				{ name: 'name2', id: 'id-2', model: 'gpt-model', other: 'other' },
				{ name: 'name3', id: 'id-3', model: 'gpt-model', other: 'other' },
			],
			has_more: false,
		});

		const response = await assistant.list.execute.call(
			createExecuteFunctionsMock({
				simplify: true,
			}),
			0,
		);

		expect(response).toEqual([
			{
				json: { name: 'name1', id: 'id-1', model: 'gpt-model' },
				pairedItem: { item: 0 },
			},
			{
				json: { name: 'name2', id: 'id-2', model: 'gpt-model' },
				pairedItem: { item: 0 },
			},
			{
				json: { name: 'name3', id: 'id-3', model: 'gpt-model' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('update => should call apiRequest with correct parameters', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({
			tools: [{ type: 'existing_tool' }],
		});
		(transport.apiRequest as jest.Mock).mockResolvedValueOnce({});

		await assistant.update.execute.call(
			createExecuteFunctionsMock({
				assistantId: 'assistant-id',
				options: {
					modelId: 'gpt-model',
					name: 'name',
					instructions: 'some instructions',
					codeInterpreter: true,
					knowledgeRetrieval: true,
					file_ids: [],
					removeCustomTools: false,
				},
			}),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', '/assistants/assistant-id', {
			headers: { 'OpenAI-Beta': 'assistants=v1' },
		});
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', '/assistants/assistant-id', {
			body: {
				file_ids: [],
				instructions: 'some instructions',
				model: 'gpt-model',
				name: 'name',
				tools: [{ type: 'existing_tool' }, { type: 'code_interpreter' }, { type: 'retrieval' }],
			},
			headers: { 'OpenAI-Beta': 'assistants=v1' },
		});
	});
});
