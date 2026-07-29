import { mock } from 'vitest-mock-extended';
import { WorkflowExpression, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import type { NodeTypes } from '@/node-types';

import { NodeToolExecutorService } from '../node-tool-executor.service';
import type { NodeToolResolverService } from '../node-tool-resolver.service';
import type { CompiledNodeToolset } from '../node-mcp-poc.types';

const description: INodeTypeDescription = {
	displayName: 'Test',
	name: 'test',
	group: ['transform'],
	version: 1,
	description: 'Test node',
	defaults: { name: 'Test' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Message',
			name: 'message',
			type: 'string',
			default: 'default message',
			displayOptions: { show: { operation: ['send'] } },
		},
		{
			displayName: 'Channel',
			name: 'channel',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
		},
		{
			displayName: 'Received Message',
			name: 'message',
			type: 'string',
			default: '',
			displayOptions: { show: { operation: ['receive'] } },
		},
	],
};

const toolset: CompiledNodeToolset = {
	endpoint: {
		endpoint: 'test',
		type: 'json-schema',
		binding: {
			nodeType: 'n8n-nodes-base.test',
			nodeVersion: 1,
			projectId: 'project',
			userId: 'user',
			credentials: {},
			fixedParameters: { authentication: 'none' },
		},
		flavor: { resolver: 'generic-single', hideOptions: false },
	},
	tools: [],
};

const inputFields = {
	message: z.string().optional(),
	channel: z.object({ mode: z.string(), value: z.union([z.string(), z.number()]) }).optional(),
	additionalFields: z.record(z.string(), z.unknown()).optional(),
};

const tool = {
	name: 'message_send',
	description: 'Send',
	destructive: false,
	resource: 'message',
	operation: 'send',
	inputSchema: z.object(inputFields).strict(),
	inputFields,
	jsonSchema: {},
	properties: description.properties,
	hiddenDefaults: {},
	dynamicParameters: [],
	deferredOptions: [],
};

describe('NodeToolExecutorService', () => {
	const ephemeralNodeExecutor = mock<EphemeralNodeExecutor>();
	const nodeTypes = mock<NodeTypes>();
	const resolver = mock<NodeToolResolverService>();
	const service = new NodeToolExecutorService(ephemeralNodeExecutor, nodeTypes, resolver);

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockReturnValue({ description } as INodeType);
		ephemeralNodeExecutor.executeInline.mockResolvedValue({
			status: 'success',
			data: [{ json: { id: 'sent' } }],
		});
	});

	it('injects fixed coordinates and defaults before inline execution', async () => {
		await service.execute(toolset, tool, {});

		expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeType: 'n8n-nodes-base.test',
				nodeTypeVersion: 1,
				projectId: 'project',
				nodeParameters: {
					authentication: 'none',
					resource: 'message',
					operation: 'send',
					message: 'default message',
					channel: { __rl: true, mode: 'list', value: '' },
				},
			}),
		);
	});

	it('preserves expressions and rejects unsafe dynamic keys', async () => {
		await service.execute(toolset, tool, { message: '={{ $json.message }}' });
		expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeParameters: expect.objectContaining({
					message: '={{ $json.message }}',
				}),
			}),
		);
		const unsafe = JSON.parse('{"additionalFields":{"__proto__":{"polluted":true}}}') as Record<
			string,
			unknown
		>;
		await expect(service.execute(toolset, tool, unsafe)).rejects.toThrow(
			'Unsafe node parameter key',
		);
	});

	it('reconstructs the internal resource locator shape', async () => {
		await service.execute(toolset, tool, {
			channel: { mode: 'list', value: 'channel-id' },
		});

		expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeParameters: expect.objectContaining({
					channel: { __rl: true, mode: 'list', value: 'channel-id' },
				}),
			}),
		);
	});

	it('resolves hidden expression defaults before validating dependent fields', async () => {
		const acquireIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'acquireIsolate')
			.mockResolvedValue(true);
		const releaseIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'releaseIsolate')
			.mockResolvedValue();
		const conditionalDescription: INodeTypeDescription = {
			...description,
			properties: [
				{
					displayName: 'Properties',
					name: 'propertiesUi',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					default: {},
					options: [
						{
							displayName: 'Property',
							name: 'propertyValues',
							values: [
								{
									displayName: 'Key',
									name: 'key',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Type',
									name: 'type',
									type: 'hidden',
									default: '={{$parameter["&key"].split("|").pop()}}',
								},
								{
									displayName: 'Select Value',
									name: 'selectValue',
									type: 'string',
									default: '',
									displayOptions: { show: { type: ['select'] } },
								},
							],
						},
					],
				},
			],
		};
		const conditionalTool = {
			...tool,
			inputSchema: z
				.object({
					propertiesUi: z.object({
						propertyValues: z.array(
							z.object({ key: z.string(), selectValue: z.string() }).strict(),
						),
					}),
				})
				.strict(),
			properties: conditionalDescription.properties,
		};
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: conditionalDescription,
		} as INodeType);

		await service.execute(toolset, conditionalTool, {
			propertiesUi: {
				propertyValues: [{ key: 'Status|select', selectValue: 'Todo' }],
			},
		});

		expect(ephemeralNodeExecutor.executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeParameters: expect.objectContaining({
					propertiesUi: {
						propertyValues: [{ key: 'Status|select', type: 'select', selectValue: 'Todo' }],
					},
				}),
			}),
		);
		expect(acquireIsolate).toHaveBeenCalledOnce();
		expect(releaseIsolate).toHaveBeenCalledOnce();
	});
});
