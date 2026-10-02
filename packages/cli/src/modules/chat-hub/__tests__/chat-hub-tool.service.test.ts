import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { INode, INodeType } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { NodeTypes } from '@/node-types';

import type { ChatHubTool } from '../chat-hub-tool.entity';
import type { ChatHubToolRepository } from '../chat-hub-tool.repository';
import { ChatHubToolService } from '../chat-hub-tool.service';

const mockDefinition: INode = {
	parameters: {
		url: 'https://example.com',
		active: true,
		options: {},
	},
	type: 'n8n-nodes-base.httpRequestTool',
	typeVersion: 4.4,
	position: [0, 0],
	id: uuid(),
	name: 'HTTP Request',
};

const mockUserId = uuid();
const mockSessionId = uuid();
const mockAgentId = uuid();

function makeTool(overrides: Partial<ChatHubTool> = {}): ChatHubTool {
	const id = overrides.id ?? uuid();
	const name = overrides.name ?? mockDefinition.name;

	// Assign onto an empty mock instead of passing overrides to mock():
	// mock(overrides) deep-wraps nested objects in proxies and mutates the
	// shared mockDefinition in place, stacking a proxy layer per call.
	return Object.assign(mock<ChatHubTool>(), {
		id,
		name,
		type: mockDefinition.type,
		typeVersion: mockDefinition.typeVersion,
		ownerId: mockUserId,
		definition: { ...mockDefinition, id, name },
		enabled: true,
		...overrides,
	});
}

describe('ChatHubToolService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const chatToolRepository = mock<ChatHubToolRepository>();
	const nodeTypes = mock<NodeTypes>();
	const mockUser = mock<User>({ id: mockUserId });

	let service: ChatHubToolService;

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);

		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { properties: [] },
		} as unknown as INodeType);

		service = new ChatHubToolService(logger, chatToolRepository, nodeTypes);
	});

	describe('getToolsByUserId', () => {
		it('should return all tools for a user', async () => {
			const tools = [makeTool(), makeTool({ id: uuid(), name: 'Test tool' })];
			chatToolRepository.getManyByUserId.mockResolvedValue(tools);

			const result = await service.getToolsByUserId(mockUserId);

			expect(chatToolRepository.getManyByUserId).toHaveBeenCalledWith(mockUserId);
			expect(result).toEqual(tools);
		});
	});

	describe('getEnabledTools', () => {
		it('should return only enabled tools', async () => {
			const tools = [makeTool()];
			chatToolRepository.getEnabledByUserId.mockResolvedValue(tools);

			const result = await service.getEnabledTools(mockUserId);

			expect(chatToolRepository.getEnabledByUserId).toHaveBeenCalledWith(mockUserId, undefined);
			expect(result).toEqual(tools);
		});
	});

	describe('getToolDefinitionsForSession', () => {
		it('should return INode definitions for a session', async () => {
			const tools = [makeTool(), makeTool({ definition: { ...mockDefinition, name: 'Test' } })];
			chatToolRepository.getToolsForSession.mockResolvedValue(tools);

			const result = await service.getToolDefinitionsForSession(mockSessionId);

			expect(chatToolRepository.getToolsForSession).toHaveBeenCalledWith(mockSessionId, undefined);
			expect(result).toEqual(tools.map((t) => t.definition));
		});
	});

	describe('getToolDefinitionsForAgent', () => {
		it('should return INode definitions for an agent', async () => {
			const tools = [makeTool()];
			chatToolRepository.getToolsForAgent.mockResolvedValue(tools);

			const result = await service.getToolDefinitionsForAgent(mockAgentId);

			expect(chatToolRepository.getToolsForAgent).toHaveBeenCalledWith(mockAgentId, undefined);
			expect(result).toEqual(tools.map((t) => t.definition));
		});
	});

	describe('createTool', () => {
		it('should create a tool from the definition', async () => {
			const created = makeTool();
			chatToolRepository.createTool.mockResolvedValue(created);

			const result = await service.createTool(mockUser, { definition: mockDefinition });

			expect(chatToolRepository.createTool).toHaveBeenCalledWith({
				id: mockDefinition.id,
				name: mockDefinition.name,
				type: mockDefinition.type,
				typeVersion: mockDefinition.typeVersion,
				ownerId: mockUser.id,
				definition: mockDefinition,
				enabled: true,
			});
			expect(result).toEqual(created);
		});

		it('should default typeVersion to 1 when not provided', async () => {
			const defWithoutVersion = { ...mockDefinition, typeVersion: undefined } as unknown as INode;
			const created = makeTool();
			chatToolRepository.createTool.mockResolvedValue(created);

			await service.createTool(mockUser, { definition: defWithoutVersion });

			expect(chatToolRepository.createTool).toHaveBeenCalledWith(
				expect.objectContaining({ typeVersion: 1 }),
			);
		});

		it('should allow $fromAI-only expressions', async () => {
			const defWithFromAI: INode = {
				...mockDefinition,
				parameters: {
					...mockDefinition.parameters,
					url: '={{ $fromAI("url", "The URL to call") }}',
				},
			};
			const created = makeTool();
			chatToolRepository.createTool.mockResolvedValue(created);

			await expect(
				service.createTool(mockUser, { definition: defWithFromAI }),
			).resolves.toBeDefined();
			expect(chatToolRepository.createTool).toHaveBeenCalled();
		});

		it('should allow $fromAI-only expressions with marker comment', async () => {
			const defWithFromAI: INode = {
				...mockDefinition,
				parameters: {
					...mockDefinition.parameters,
					active: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Active', ``, 'boolean') }}",
				},
			};
			const created = makeTool();
			chatToolRepository.createTool.mockResolvedValue(created);

			await expect(
				service.createTool(mockUser, { definition: defWithFromAI }),
			).resolves.toBeDefined();
			expect(chatToolRepository.createTool).toHaveBeenCalled();
		});

		it('should reject disallowed expressions', async () => {
			const defWithExpression: INode = {
				...mockDefinition,
				parameters: {
					url: '={{ $env.API_URL }}',
					options: {},
				},
			};

			await expect(service.createTool(mockUser, { definition: defWithExpression })).rejects.toThrow(
				BadRequestError,
			);
			expect(chatToolRepository.createTool).not.toHaveBeenCalled();
		});

		it('should allow expressions that match node description defaults', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: {
					properties: [
						{
							displayName: 'Start',
							name: 'start',
							type: 'string',
							default: '={{ $now }}',
						},
						{
							displayName: 'End',
							name: 'end',
							type: 'string',
							default: "={{ $now.plus(1, 'hour') }}",
						},
					],
				},
			} as unknown as INodeType);

			const defWithDefaults: INode = {
				...mockDefinition,
				parameters: {
					start: '={{ $now }}',
					end: "={{ $now.plus(1, 'hour') }}",
				},
			};
			const created = makeTool();
			chatToolRepository.createTool.mockResolvedValue(created);

			await expect(
				service.createTool(mockUser, { definition: defWithDefaults }),
			).resolves.toBeDefined();
			expect(chatToolRepository.createTool).toHaveBeenCalled();
		});

		it('should still reject arbitrary expressions even when some defaults are allowed', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: {
					properties: [
						{
							displayName: 'Start',
							name: 'start',
							type: 'string',
							default: '={{ $now }}',
						},
					],
				},
			} as unknown as INodeType);

			const defWithMixed: INode = {
				...mockDefinition,
				parameters: {
					start: '={{ $now }}',
					secret: '={{ $env.SECRET }}',
				},
			};

			await expect(service.createTool(mockUser, { definition: defWithMixed })).rejects.toThrow(
				BadRequestError,
			);
			expect(chatToolRepository.createTool).not.toHaveBeenCalled();
		});

		it('should fall back to strict validation when node type lookup fails', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Node type not found');
			});

			const defWithExpression: INode = {
				...mockDefinition,
				parameters: {
					start: '={{ $now }}',
				},
			};

			await expect(service.createTool(mockUser, { definition: defWithExpression })).rejects.toThrow(
				BadRequestError,
			);
			expect(chatToolRepository.createTool).not.toHaveBeenCalled();
		});
	});

	describe('updateTool', () => {
		it('should update tool definition and denormalized fields', async () => {
			const existingTool = makeTool();
			const updatedDef: INode = { ...mockDefinition, name: 'Updated Tool' };
			const updatedTool = makeTool({ name: 'Updated Tool', definition: updatedDef });

			chatToolRepository.getOneById.mockResolvedValue(existingTool);
			chatToolRepository.updateOwnedTool.mockResolvedValue(updatedTool);

			const result = await service.updateTool(existingTool.id, mockUser, {
				definition: updatedDef,
			});

			expect(chatToolRepository.updateOwnedTool).toHaveBeenCalledWith(
				existingTool.id,
				mockUser.id,
				{
					definition: updatedDef,
					name: 'Updated Tool',
					type: updatedDef.type,
					typeVersion: updatedDef.typeVersion,
				},
				undefined,
			);
			expect(result).toEqual(updatedTool);
		});

		it('should update only the enabled flag when no definition provided', async () => {
			const existingTool = makeTool();
			const updatedTool = makeTool({ enabled: false });

			chatToolRepository.updateOwnedTool.mockResolvedValue(updatedTool);

			const result = await service.updateTool(existingTool.id, mockUser, { enabled: false });

			expect(chatToolRepository.updateOwnedTool).toHaveBeenCalledWith(
				existingTool.id,
				mockUser.id,
				{ enabled: false },
				undefined,
			);
			expect(result).toEqual(updatedTool);
		});

		it('should throw NotFoundError when tool does not exist', async () => {
			chatToolRepository.updateOwnedTool.mockRejectedValue(
				new NotFoundError('Chat hub tool not found'),
			);
			const nonexistentId = uuid();

			await expect(service.updateTool(nonexistentId, mockUser, { enabled: false })).rejects.toThrow(
				NotFoundError,
			);

			expect(chatToolRepository.updateOwnedTool).toHaveBeenCalled();
		});

		it('should reject disallowed expressions in definition update', async () => {
			const existingTool = makeTool();
			chatToolRepository.getOneById.mockResolvedValue(existingTool);

			const defWithExpression: INode = {
				...mockDefinition,
				parameters: {
					...mockDefinition.parameters,
					url: '={{ $json.url }}',
				},
			};

			await expect(
				service.updateTool(existingTool.id, mockUser, { definition: defWithExpression }),
			).rejects.toThrow(BadRequestError);

			expect(chatToolRepository.updateOwnedTool).not.toHaveBeenCalled();
		});

		it('should return NotFoundError before validating a missing tool definition', async () => {
			const defWithExpression: INode = {
				...mockDefinition,
				parameters: { url: '={{ $json.url }}' },
			};
			chatToolRepository.getOneById.mockResolvedValue(null);

			await expect(
				service.updateTool(uuid(), mockUser, { definition: defWithExpression }),
			).rejects.toThrow(NotFoundError);
			expect(chatToolRepository.updateOwnedTool).not.toHaveBeenCalled();
		});

		it('should allow updates without definition (e.g. enabled-only)', async () => {
			const existingTool = makeTool();
			const updatedTool = makeTool({ enabled: false });

			chatToolRepository.updateOwnedTool.mockResolvedValue(updatedTool);

			await expect(
				service.updateTool(existingTool.id, mockUser, { enabled: false }),
			).resolves.toBeDefined();
		});
	});

	describe('deleteTool', () => {
		it('should delete an existing tool', async () => {
			const existingTool = makeTool();
			await service.deleteTool(existingTool.id, mockUser.id);

			expect(chatToolRepository.deleteOwnedTool).toHaveBeenCalledWith(
				existingTool.id,
				mockUser.id,
				undefined,
			);
		});

		it('should throw NotFoundError when tool does not exist', async () => {
			chatToolRepository.deleteOwnedTool.mockRejectedValue(
				new NotFoundError('Chat hub tool not found'),
			);
			const nonexistentId = uuid();

			await expect(service.deleteTool(nonexistentId, mockUser.id)).rejects.toThrow(NotFoundError);

			expect(chatToolRepository.deleteOwnedTool).toHaveBeenCalled();
		});
	});

	describe('toDto', () => {
		it('should convert a tool entity to a DTO', () => {
			const tool = makeTool();

			const dto = ChatHubToolService.toDto(tool);

			expect(dto).toEqual({
				definition: tool.definition,
				enabled: tool.enabled,
			});
		});
	});
});
