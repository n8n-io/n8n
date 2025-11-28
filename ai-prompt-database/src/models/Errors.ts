/**
 * Erro base para a aplicação
 */
export class AppError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode: number = 500,
	) {
		super(message);
		this.name = 'AppError';
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Erro quando prompt não é encontrado
 */
export class PromptNotFoundError extends AppError {
	constructor(promptId: string) {
		super(`Prompt com ID ${promptId} não encontrado`, 'PROMPT_NOT_FOUND', 404);
		this.name = 'PromptNotFoundError';
	}
}

/**
 * Erro de validação
 */
export class ValidationError extends AppError {
	constructor(message: string) {
		super(message, 'VALIDATION_ERROR', 400);
		this.name = 'ValidationError';
	}
}

/**
 * Erro de duplicação
 */
export class DuplicateError extends AppError {
	constructor(message: string) {
		super(message, 'DUPLICATE_ERROR', 409);
		this.name = 'DuplicateError';
	}
}

/**
 * Erro de armazenamento
 */
export class StorageError extends AppError {
	constructor(message: string) {
		super(message, 'STORAGE_ERROR', 500);
		this.name = 'StorageError';
	}
}
