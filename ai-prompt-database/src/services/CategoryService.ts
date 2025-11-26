import { Prompt } from '../models/index.js';
import { PromptStorage } from '../storage/index.js';

/**
 * Serviço para gerenciar categorias e tags
 */
export class CategoryService {
	private readonly storage: PromptStorage;

	constructor(dataPath?: string) {
		this.storage = new PromptStorage(dataPath);
	}

	/**
	 * Lista todas as categorias únicas
	 */
	async listCategories(): Promise<string[]> {
		const prompts = await this.storage.listPrompts();
		const categories = new Set<string>();

		for (const prompt of prompts) {
			if (prompt.category) {
				categories.add(prompt.category);
			}
		}

		return Array.from(categories).sort();
	}

	/**
	 * Lista todas as tags únicas
	 */
	async listTags(): Promise<string[]> {
		const prompts = await this.storage.listPrompts();
		const tags = new Set<string>();

		for (const prompt of prompts) {
			for (const tag of prompt.tags) {
				tags.add(tag);
			}
		}

		return Array.from(tags).sort();
	}

	/**
	 * Lista prompts por categoria
	 */
	async getPromptsByCategory(category: string): Promise<Prompt[]> {
		const prompts = await this.storage.listPrompts();
		return prompts.filter((prompt) => prompt.category === category);
	}

	/**
	 * Lista prompts por tag
	 */
	async getPromptsByTag(tag: string): Promise<Prompt[]> {
		const prompts = await this.storage.listPrompts();
		return prompts.filter((prompt) => prompt.tags.includes(tag));
	}

	/**
	 * Lista prompts que contêm todas as tags especificadas
	 */
	async getPromptsByTags(tags: string[]): Promise<Prompt[]> {
		const prompts = await this.storage.listPrompts();
		return prompts.filter((prompt) => tags.every((tag) => prompt.tags.includes(tag)));
	}

	/**
	 * Obtém estatísticas de uso de categorias
	 */
	async getCategoryStats(): Promise<Record<string, number>> {
		const prompts = await this.storage.listPrompts();
		const stats: Record<string, number> = {};

		for (const prompt of prompts) {
			if (prompt.category) {
				stats[prompt.category] = (stats[prompt.category] || 0) + 1;
			}
		}

		return stats;
	}

	/**
	 * Obtém estatísticas de uso de tags
	 */
	async getTagStats(): Promise<Record<string, number>> {
		const prompts = await this.storage.listPrompts();
		const stats: Record<string, number> = {};

		for (const prompt of prompts) {
			for (const tag of prompt.tags) {
				stats[tag] = (stats[tag] || 0) + 1;
			}
		}

		return stats;
	}
}
