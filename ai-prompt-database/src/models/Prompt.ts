/**
 * Representa um parâmetro de um prompt
 */
export interface PromptParameter {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	description: string;
	required: boolean;
	defaultValue?: unknown;
}

/**
 * Representa um prompt de IA
 */
export interface Prompt {
	id: string;
	name: string;
	description: string;
	content: string;
	category: string;
	tags: string[];
	parameters: PromptParameter[];
	aiModel: string;
	version: number;
	createdAt: string;
	updatedAt: string;
	author: string;
	shared: boolean;
}

/**
 * Dados para criar um novo prompt
 */
export interface CreatePromptData {
	name: string;
	description: string;
	content: string;
	category: string;
	tags?: string[];
	parameters?: PromptParameter[];
	aiModel: string;
	author?: string;
	shared?: boolean;
}

/**
 * Dados para atualizar um prompt existente
 */
export interface UpdatePromptData {
	name?: string;
	description?: string;
	content?: string;
	category?: string;
	tags?: string[];
	parameters?: PromptParameter[];
	aiModel?: string;
	shared?: boolean;
}

/**
 * Representa uma versão histórica de um prompt
 */
export interface PromptVersion {
	promptId: string;
	version: number;
	prompt: Prompt;
	changedAt: string;
	changedBy: string;
	changeDescription?: string;
}

/**
 * Filtros para busca de prompts
 */
export interface PromptSearchFilters {
	name?: string;
	category?: string;
	tags?: string[];
	aiModel?: string;
	author?: string;
	shared?: boolean;
	contentSearch?: string;
}

/**
 * Resultado de busca paginado
 */
export interface SearchResult<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
}
