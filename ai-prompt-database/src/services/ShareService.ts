import fs from 'fs/promises';
import { Prompt, CreatePromptData, ValidationError } from '../models/index.js';
import { PromptStorage } from '../storage/index.js';
import { PromptService } from './PromptService.js';

/**
 * Formato de exportação de prompts
 */
interface ExportFormat {
	version: string;
	exportedAt: string;
	prompts: Prompt[];
}

/**
 * Serviço para compartilhamento de prompts (export/import)
 */
export class ShareService {
	private readonly storage: PromptStorage;
	private readonly promptService: PromptService;

	constructor(dataPath?: string) {
		this.storage = new PromptStorage(dataPath);
		this.promptService = new PromptService(dataPath);
	}

	/**
	 * Exporta um prompt para arquivo JSON
	 */
	async exportPrompt(promptId: string, filePath: string): Promise<void> {
		const prompt = await this.promptService.getPromptById(promptId);

		const exportData: ExportFormat = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			prompts: [prompt],
		};

		await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
	}

	/**
	 * Exporta múltiplos prompts para arquivo JSON
	 */
	async exportPrompts(promptIds: string[], filePath: string): Promise<void> {
		const prompts: Prompt[] = [];

		for (const id of promptIds) {
			const prompt = await this.promptService.getPromptById(id);
			prompts.push(prompt);
		}

		const exportData: ExportFormat = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			prompts,
		};

		await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
	}

	/**
	 * Exporta todos os prompts
	 */
	async exportAllPrompts(filePath: string): Promise<void> {
		const prompts = await this.storage.listPrompts();

		const exportData: ExportFormat = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			prompts,
		};

		await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
	}

	/**
	 * Importa prompts de um arquivo JSON
	 */
	async importPrompts(
		filePath: string,
		options: {
			overwrite?: boolean;
			preserveIds?: boolean;
			author?: string;
		} = {},
	): Promise<Prompt[]> {
		const fileContent = await fs.readFile(filePath, 'utf-8');
		const importData = JSON.parse(fileContent) as ExportFormat;

		if (!importData.prompts || !Array.isArray(importData.prompts)) {
			throw new ValidationError('Arquivo de importação inválido');
		}

		const importedPrompts: Prompt[] = [];

		for (const promptData of importData.prompts) {
			let prompt: Prompt;

			// Verifica se deve preservar IDs e se já existe
			if (options.preserveIds && promptData.id) {
				const exists = await this.storage.promptExists(promptData.id);

				if (exists && !options.overwrite) {
					// Pula se já existe e não deve sobrescrever
					continue;
				}

				if (exists && options.overwrite) {
					// Atualiza o prompt existente
					const updateData: CreatePromptData = {
						name: promptData.name,
						description: promptData.description,
						content: promptData.content,
						category: promptData.category,
						tags: promptData.tags,
						parameters: promptData.parameters,
						aiModel: promptData.aiModel,
						author: options.author || promptData.author,
						shared: promptData.shared,
					};

					prompt = await this.promptService.updatePrompt(
						promptData.id,
						updateData,
						options.author || 'import',
					);
				} else {
					// Cria novo com ID preservado
					await this.storage.savePrompt(promptData);
					prompt = promptData;
				}
			} else {
				// Cria novo prompt com novo ID
				const createData: CreatePromptData = {
					name: promptData.name,
					description: promptData.description,
					content: promptData.content,
					category: promptData.category,
					tags: promptData.tags,
					parameters: promptData.parameters,
					aiModel: promptData.aiModel,
					author: options.author || promptData.author,
					shared: promptData.shared,
				};

				prompt = await this.promptService.createPrompt(createData);
			}

			importedPrompts.push(prompt);
		}

		return importedPrompts;
	}

	/**
	 * Lista prompts compartilhados
	 */
	async listSharedPrompts(): Promise<Prompt[]> {
		return this.storage.listSharedPrompts();
	}

	/**
	 * Marca um prompt como compartilhado
	 */
	async sharePrompt(promptId: string): Promise<Prompt> {
		return this.promptService.updatePrompt(promptId, { shared: true });
	}

	/**
	 * Remove marca de compartilhado de um prompt
	 */
	async unsharePrompt(promptId: string): Promise<Prompt> {
		return this.promptService.updatePrompt(promptId, { shared: false });
	}
}
