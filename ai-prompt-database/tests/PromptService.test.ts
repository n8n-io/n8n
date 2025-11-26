import { PromptService } from '../src/services/PromptService';
import { CreatePromptData } from '../src/models/Prompt';
import { PromptNotFoundError, ValidationError } from '../src/models/Errors';

describe('PromptService', () => {
	let promptService: PromptService;

	beforeEach(() => {
		// Usa diretório temporário para testes
		promptService = new PromptService('/tmp/ai-prompts-test');
	});

	describe('createPrompt', () => {
		it('deve criar um novo prompt com dados válidos', async () => {
			const data: CreatePromptData = {
				name: 'Test Prompt',
				description: 'Test description',
				content: 'Test content',
				category: 'Test',
				tags: ['test', 'example'],
				aiModel: 'gpt-4',
				author: 'tester',
			};

			const prompt = await promptService.createPrompt(data);

			expect(prompt.id).toBeDefined();
			expect(prompt.name).toBe(data.name);
			expect(prompt.category).toBe(data.category);
			expect(prompt.version).toBe(1);
		});

		it('deve lançar erro se nome estiver vazio', async () => {
			const data: CreatePromptData = {
				name: '',
				description: 'Test',
				content: 'Test',
				category: 'Test',
				aiModel: 'gpt-4',
			};

			await expect(promptService.createPrompt(data)).rejects.toThrow(ValidationError);
		});

		it('deve lançar erro se conteúdo estiver vazio', async () => {
			const data: CreatePromptData = {
				name: 'Test',
				description: 'Test',
				content: '',
				category: 'Test',
				aiModel: 'gpt-4',
			};

			await expect(promptService.createPrompt(data)).rejects.toThrow(ValidationError);
		});
	});

	describe('getPromptById', () => {
		it('deve retornar um prompt existente', async () => {
			const data: CreatePromptData = {
				name: 'Test Prompt',
				description: 'Test',
				content: 'Test',
				category: 'Test',
				aiModel: 'gpt-4',
			};

			const created = await promptService.createPrompt(data);
			const found = await promptService.getPromptById(created.id);

			expect(found.id).toBe(created.id);
			expect(found.name).toBe(created.name);
		});

		it('deve lançar erro para ID inexistente', async () => {
			await expect(promptService.getPromptById('invalid-id')).rejects.toThrow(
				PromptNotFoundError,
			);
		});
	});

	describe('updatePrompt', () => {
		it('deve atualizar um prompt existente', async () => {
			const data: CreatePromptData = {
				name: 'Original Name',
				description: 'Test',
				content: 'Test',
				category: 'Test',
				aiModel: 'gpt-4',
			};

			const created = await promptService.createPrompt(data);
			const updated = await promptService.updatePrompt(created.id, {
				name: 'Updated Name',
			});

			expect(updated.name).toBe('Updated Name');
			expect(updated.version).toBe(2);
		});
	});

	describe('deletePrompt', () => {
		it('deve deletar um prompt existente', async () => {
			const data: CreatePromptData = {
				name: 'To Delete',
				description: 'Test',
				content: 'Test',
				category: 'Test',
				aiModel: 'gpt-4',
			};

			const created = await promptService.createPrompt(data);
			await promptService.deletePrompt(created.id);

			await expect(promptService.getPromptById(created.id)).rejects.toThrow(
				PromptNotFoundError,
			);
		});
	});

	describe('listAllPrompts', () => {
		it('deve listar todos os prompts', async () => {
			const prompts = await promptService.listAllPrompts();
			expect(Array.isArray(prompts)).toBe(true);
		});
	});
});
