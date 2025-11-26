import { v4 as uuidv4 } from 'uuid';
import {
	Prompt,
	CreatePromptData,
	UpdatePromptData,
	PromptVersion,
	PromptNotFoundError,
	ValidationError,
} from '../models/index.js';
import { PromptStorage } from '../storage/index.js';

/**
 * Serviço para gerenciar operações CRUD de prompts
 */
export class PromptService {
	private readonly storage: PromptStorage;

	constructor(dataPath?: string) {
		this.storage = new PromptStorage(dataPath);
	}

	/**
	 * Valida os dados de um prompt
	 */
	private validatePromptData(data: CreatePromptData): void {
		if (!data.name || data.name.trim().length === 0) {
			throw new ValidationError('Nome do prompt é obrigatório');
		}

		if (!data.content || data.content.trim().length === 0) {
			throw new ValidationError('Conteúdo do prompt é obrigatório');
		}

		if (!data.aiModel || data.aiModel.trim().length === 0) {
			throw new ValidationError('Modelo de IA é obrigatório');
		}

		if (!data.category || data.category.trim().length === 0) {
			throw new ValidationError('Categoria é obrigatória');
		}
	}

	/**
	 * Cria um novo prompt
	 */
	async createPrompt(data: CreatePromptData): Promise<Prompt> {
		this.validatePromptData(data);

		const now = new Date().toISOString();
		const prompt: Prompt = {
			id: uuidv4(),
			name: data.name.trim(),
			description: data.description.trim(),
			content: data.content.trim(),
			category: data.category.trim(),
			tags: data.tags || [],
			parameters: data.parameters || [],
			aiModel: data.aiModel.trim(),
			version: 1,
			createdAt: now,
			updatedAt: now,
			author: data.author || 'unknown',
			shared: data.shared || false,
		};

		await this.storage.savePrompt(prompt);

		// Salva primeira versão
		await this.saveVersion(prompt, 'unknown', 'Criação inicial do prompt');

		return prompt;
	}

	/**
	 * Busca um prompt pelo ID
	 */
	async getPromptById(id: string): Promise<Prompt> {
		const prompt = await this.storage.getPrompt(id);
		if (!prompt) {
			throw new PromptNotFoundError(id);
		}
		return prompt;
	}

	/**
	 * Lista todos os prompts
	 */
	async listAllPrompts(): Promise<Prompt[]> {
		return this.storage.listPrompts();
	}

	/**
	 * Atualiza um prompt existente
	 */
	async updatePrompt(
		id: string,
		data: UpdatePromptData,
		updatedBy: string = 'unknown',
	): Promise<Prompt> {
		const existingPrompt = await this.getPromptById(id);

		// Salva versão antes de atualizar
		await this.saveVersion(existingPrompt, updatedBy, 'Atualização do prompt');

		const updatedPrompt: Prompt = {
			...existingPrompt,
			name: data.name !== undefined ? data.name.trim() : existingPrompt.name,
			description:
				data.description !== undefined ? data.description.trim() : existingPrompt.description,
			content: data.content !== undefined ? data.content.trim() : existingPrompt.content,
			category: data.category !== undefined ? data.category.trim() : existingPrompt.category,
			tags: data.tags !== undefined ? data.tags : existingPrompt.tags,
			parameters: data.parameters !== undefined ? data.parameters : existingPrompt.parameters,
			aiModel: data.aiModel !== undefined ? data.aiModel.trim() : existingPrompt.aiModel,
			shared: data.shared !== undefined ? data.shared : existingPrompt.shared,
			version: existingPrompt.version + 1,
			updatedAt: new Date().toISOString(),
		};

		await this.storage.savePrompt(updatedPrompt);

		return updatedPrompt;
	}

	/**
	 * Deleta um prompt
	 */
	async deletePrompt(id: string): Promise<void> {
		// Verifica se existe antes de deletar
		await this.getPromptById(id);
		await this.storage.deletePrompt(id);
	}

	/**
	 * Salva uma versão do prompt
	 */
	private async saveVersion(
		prompt: Prompt,
		changedBy: string,
		changeDescription?: string,
	): Promise<void> {
		const version: PromptVersion = {
			promptId: prompt.id,
			version: prompt.version,
			prompt: { ...prompt },
			changedAt: new Date().toISOString(),
			changedBy,
			changeDescription,
		};

		await this.storage.saveVersion(version);
	}

	/**
	 * Lista todas as versões de um prompt
	 */
	async getPromptVersions(promptId: string): Promise<PromptVersion[]> {
		// Verifica se o prompt existe
		await this.getPromptById(promptId);
		return this.storage.getVersions(promptId);
	}

	/**
	 * Restaura uma versão específica de um prompt
	 */
	async restoreVersion(promptId: string, version: number, restoredBy: string): Promise<Prompt> {
		const versions = await this.getPromptVersions(promptId);
		const targetVersion = versions.find((v) => v.version === version);

		if (!targetVersion) {
			throw new ValidationError(`Versão ${version} não encontrada para o prompt ${promptId}`);
		}

		// Salva versão atual antes de restaurar
		const currentPrompt = await this.getPromptById(promptId);
		await this.saveVersion(currentPrompt, restoredBy, `Restauração para versão ${version}`);

		const restoredPrompt: Prompt = {
			...targetVersion.prompt,
			version: currentPrompt.version + 1,
			updatedAt: new Date().toISOString(),
		};

		await this.storage.savePrompt(restoredPrompt);

		return restoredPrompt;
	}
}
