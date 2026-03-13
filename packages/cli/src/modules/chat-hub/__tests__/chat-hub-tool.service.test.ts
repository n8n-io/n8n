import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { ChatHubTool } from '../chat-hub-tool.entity';
import type { ChatHubToolRepository } from '../chat-hub-tool.repository';
import { ChatHubToolService } from '../chat-hub-tool.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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

	return mock<ChatHubTool>({
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
	const mockUser = mock<User>({ id: mockUserId });
	const mockManager = mock<EntityManager>();

	let service: ChatHubToolService;

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnValue(logger);

		// withTransaction calls manager.transaction when no trx is passed
		Object.defineProperty(chatToolRepository, 'manager', { value: mockManager });
		mockManager.transaction.mockImplementation(async (fn: unknown) => {
			return await (fn as (em: EntityManager) => Promise<unknown>)(mockManager);
		});

		service = new ChatHubToolService(logger, chatToolRepository);
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
	});

	describe('updateTool', () => {
		it('should update tool definition and denormalized fields', async () => {
			const existingTool = makeTool();
			const updatedDef: INode = { ...mockDefinition, name: 'Updated Tool' };
			const updatedTool = makeTool({ name: 'Updated Tool', definition: updatedDef });

			chatToolRepository.getOneById.mockResolvedValue(existingTool);
			chatToolRepository.updateTool.mockResolvedValue(updatedTool);

			const result = await service.updateTool(existingTool.id, mockUser, {
				definition: updatedDef,
			});

			expect(chatToolRepository.getOneById).toHaveBeenCalledWith(
				existingTool.id,
				mockUser.id,
				mockManager,
			);
			expect(chatToolRepository.updateTool).toHaveBeenCalledWith(
				existingTool.id,
				{
					definition: updatedDef,
					name: 'Updated Tool',
					type: updatedDef.type,
					typeVersion: updatedDef.typeVersion,
				},
				mockManager,
			);
			expect(result).toEqual(updatedTool);
		});

		it('should update only the enabled flag when no definition provided', async () => {
			const existingTool = makeTool();
			const updatedTool = makeTool({ enabled: false });

			chatToolRepository.getOneById.mockResolvedValue(existingTool);
			chatToolRepository.updateTool.mockResolvedValue(updatedTool);

			const result = await service.updateTool(existingTool.id, mockUser, { enabled: false });

			expect(chatToolRepository.updateTool).toHaveBeenCalledWith(
				existingTool.id,
				{ enabled: false },
				mockManager,
			);
			expect(result).toEqual(updatedTool);
		});

		it('should throw NotFoundError when tool does not exist', async () => {
			chatToolRepository.getOneById.mockResolvedValue(null);
			const nonexistentId = uuid();

			await expect(service.updateTool(nonexistentId, mockUser, { enabled: false })).rejects.toThrow(
				NotFoundError,
			);

			expect(chatToolRepository.updateTool).not.toHaveBeenCalled();
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

			expect(chatToolRepository.updateTool).not.toHaveBeenCalled();
		});

		it('should allow updates without definition (e.g. enabled-only)', async () => {
			const existingTool = makeTool();
			const updatedTool = makeTool({ enabled: false });

			chatToolRepository.getOneById.mockResolvedValue(existingTool);
			chatToolRepository.updateTool.mockResolvedValue(updatedTool);

			await expect(
				service.updateTool(existingTool.id, mockUser, { enabled: false }),
			).resolves.toBeDefined();
		});
	});

	describe('deleteTool', () => {
		it('should delete an existing tool', async () => {
			const existingTool = makeTool();
			chatToolRepository.getOneById.mockResolvedValue(existingTool);

			await service.deleteTool(existingTool.id, mockUser.id);

			expect(chatToolRepository.getOneById).toHaveBeenCalledWith(
				existingTool.id,
				mockUser.id,
				mockManager,
			);
			expect(chatToolRepository.deleteTool).toHaveBeenCalledWith(existingTool.id, mockManager);
		});

		it('should throw NotFoundError when tool does not exist', async () => {
			chatToolRepository.getOneById.mockResolvedValue(null);
			const nonexistentId = uuid();

			await expect(service.deleteTool(nonexistentId, mockUser.id)).rejects.toThrow(NotFoundError);

			expect(chatToolRepository.deleteTool).not.toHaveBeenCalled();
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
