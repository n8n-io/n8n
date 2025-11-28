import path from 'path';
import { fileURLToPath } from 'url';
import { Prompt, PromptVersion } from '../models/index.js';
import { FileStorage } from './FileStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Classe para gerenciar armazenamento de prompts
 */
export class PromptStorage {
	private readonly promptStorage: FileStorage<Prompt>;
	private readonly versionStorage: FileStorage<PromptVersion[]>;
	private readonly sharedStorage: FileStorage<Prompt>;

	constructor(dataPath?: string) {
		const basePath = dataPath || path.join(__dirname, '../../data');

		this.promptStorage = new FileStorage<Prompt>(path.join(basePath, 'prompts'));
		this.versionStorage = new FileStorage<PromptVersion[]>(path.join(basePath, 'versions'));
		this.sharedStorage = new FileStorage<Prompt>(path.join(basePath, 'shared'));
	}

	/**
	 * Salva um prompt
	 */
	async savePrompt(prompt: Prompt): Promise<void> {
		const filename = `${prompt.id}.json`;
		await this.promptStorage.write(filename, prompt);

		if (prompt.shared) {
			await this.sharedStorage.write(filename, prompt);
		}
	}

	/**
	 * Lê um prompt pelo ID
	 */
	async getPrompt(id: string): Promise<Prompt | undefined> {
		try {
			return await this.promptStorage.read(`${id}.json`);
		} catch {
			return undefined;
		}
	}

	/**
	 * Deleta um prompt
	 */
	async deletePrompt(id: string): Promise<void> {
		await this.promptStorage.delete(`${id}.json`);

		// Tenta deletar das versões e compartilhados (ignora erros se não existir)
		try {
			await this.versionStorage.delete(`${id}.json`);
		} catch {
			// Ignora se não existir
		}

		try {
			await this.sharedStorage.delete(`${id}.json`);
		} catch {
			// Ignora se não existir
		}
	}

	/**
	 * Lista todos os prompts
	 */
	async listPrompts(): Promise<Prompt[]> {
		return this.promptStorage.readAll();
	}

	/**
	 * Salva uma versão do prompt
	 */
	async saveVersion(version: PromptVersion): Promise<void> {
		const filename = `${version.promptId}.json`;
		let versions: PromptVersion[] = [];

		try {
			versions = await this.versionStorage.read(filename);
		} catch {
			// Arquivo não existe ainda
		}

		versions.push(version);
		await this.versionStorage.write(filename, versions);
	}

	/**
	 * Lista todas as versões de um prompt
	 */
	async getVersions(promptId: string): Promise<PromptVersion[]> {
		try {
			return await this.versionStorage.read(`${promptId}.json`);
		} catch {
			return [];
		}
	}

	/**
	 * Lista prompts compartilhados
	 */
	async listSharedPrompts(): Promise<Prompt[]> {
		return this.sharedStorage.readAll();
	}

	/**
	 * Verifica se um prompt existe
	 */
	async promptExists(id: string): Promise<boolean> {
		return this.promptStorage.exists(`${id}.json`);
	}
}
