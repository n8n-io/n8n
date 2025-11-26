import { Prompt, PromptSearchFilters, SearchResult } from '../models/index.js';
import { PromptStorage } from '../storage/index.js';

/**
 * Serviço para busca e filtros avançados de prompts
 */
export class SearchService {
	private readonly storage: PromptStorage;

	constructor(dataPath?: string) {
		this.storage = new PromptStorage(dataPath);
	}

	/**
	 * Busca prompts com filtros avançados
	 */
	async searchPrompts(filters: PromptSearchFilters, page = 1, pageSize = 10): Promise<SearchResult<Prompt>> {
		const allPrompts = await this.storage.listPrompts();
		let filteredPrompts = allPrompts;

		// Filtro por nome (case-insensitive, busca parcial)
		if (filters.name) {
			const searchName = filters.name.toLowerCase();
			filteredPrompts = filteredPrompts.filter((prompt) =>
				prompt.name.toLowerCase().includes(searchName),
			);
		}

		// Filtro por categoria (exato)
		if (filters.category) {
			filteredPrompts = filteredPrompts.filter((prompt) => prompt.category === filters.category);
		}

		// Filtro por tags (deve conter todas as tags especificadas)
		if (filters.tags && filters.tags.length > 0) {
			filteredPrompts = filteredPrompts.filter((prompt) =>
				filters.tags!.every((tag) => prompt.tags.includes(tag)),
			);
		}

		// Filtro por modelo de IA
		if (filters.aiModel) {
			filteredPrompts = filteredPrompts.filter((prompt) => prompt.aiModel === filters.aiModel);
		}

		// Filtro por autor
		if (filters.author) {
			filteredPrompts = filteredPrompts.filter((prompt) => prompt.author === filters.author);
		}

		// Filtro por compartilhado
		if (filters.shared !== undefined) {
			filteredPrompts = filteredPrompts.filter((prompt) => prompt.shared === filters.shared);
		}

		// Busca no conteúdo (case-insensitive)
		if (filters.contentSearch) {
			const searchContent = filters.contentSearch.toLowerCase();
			filteredPrompts = filteredPrompts.filter(
				(prompt) =>
					prompt.content.toLowerCase().includes(searchContent) ||
					prompt.description.toLowerCase().includes(searchContent),
			);
		}

		// Ordenação por data de atualização (mais recentes primeiro)
		filteredPrompts.sort((a, b) => {
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});

		// Paginação
		const total = filteredPrompts.length;
		const startIndex = (page - 1) * pageSize;
		const endIndex = startIndex + pageSize;
		const paginatedPrompts = filteredPrompts.slice(startIndex, endIndex);

		return {
			items: paginatedPrompts,
			total,
			page,
			pageSize,
		};
	}

	/**
	 * Busca rápida por texto (nome, descrição ou conteúdo)
	 */
	async quickSearch(query: string): Promise<Prompt[]> {
		const allPrompts = await this.storage.listPrompts();
		const searchQuery = query.toLowerCase();

		return allPrompts.filter(
			(prompt) =>
				prompt.name.toLowerCase().includes(searchQuery) ||
				prompt.description.toLowerCase().includes(searchQuery) ||
				prompt.content.toLowerCase().includes(searchQuery) ||
				prompt.tags.some((tag) => tag.toLowerCase().includes(searchQuery)),
		);
	}

	/**
	 * Busca prompts similares baseado em tags
	 */
	async findSimilarPrompts(promptId: string, limit = 5): Promise<Prompt[]> {
		const allPrompts = await this.storage.listPrompts();
		const targetPrompt = allPrompts.find((p) => p.id === promptId);

		if (!targetPrompt) {
			return [];
		}

		// Calcula score de similaridade baseado em tags em comum
		const scoredPrompts = allPrompts
			.filter((prompt) => prompt.id !== promptId)
			.map((prompt) => {
				const commonTags = prompt.tags.filter((tag) => targetPrompt.tags.includes(tag)).length;
				const sameCategory = prompt.category === targetPrompt.category ? 1 : 0;
				const sameModel = prompt.aiModel === targetPrompt.aiModel ? 0.5 : 0;

				return {
					prompt,
					score: commonTags * 2 + sameCategory + sameModel,
				};
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);

		return scoredPrompts.map((item) => item.prompt);
	}

	/**
	 * Lista prompts mais recentes
	 */
	async getRecentPrompts(limit = 10): Promise<Prompt[]> {
		const allPrompts = await this.storage.listPrompts();

		return allPrompts
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
			.slice(0, limit);
	}

	/**
	 * Lista prompts mais antigos
	 */
	async getOldestPrompts(limit = 10): Promise<Prompt[]> {
		const allPrompts = await this.storage.listPrompts();

		return allPrompts
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
			.slice(0, limit);
	}
}
