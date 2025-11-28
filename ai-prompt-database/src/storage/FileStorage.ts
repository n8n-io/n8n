import fs from 'fs/promises';
import path from 'path';
import { StorageError } from '../models/index.js';

/**
 * Classe para gerenciar armazenamento em arquivos JSON
 */
export class FileStorage<T> {
	private readonly basePath: string;

	constructor(basePath: string) {
		this.basePath = basePath;
	}

	/**
	 * Garante que o diretório existe
	 */
	private async ensureDirectory(dirPath: string): Promise<void> {
		try {
			await fs.mkdir(dirPath, { recursive: true });
		} catch (error) {
			throw new StorageError(`Erro ao criar diretório ${dirPath}: ${(error as Error).message}`);
		}
	}

	/**
	 * Lê um arquivo JSON
	 */
	async read(filename: string): Promise<T> {
		try {
			const filePath = path.join(this.basePath, filename);
			const data = await fs.readFile(filePath, 'utf-8');
			return JSON.parse(data) as T;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				throw new StorageError(`Arquivo ${filename} não encontrado`);
			}
			throw new StorageError(`Erro ao ler arquivo ${filename}: ${(error as Error).message}`);
		}
	}

	/**
	 * Escreve dados em um arquivo JSON
	 */
	async write(filename: string, data: T): Promise<void> {
		try {
			await this.ensureDirectory(this.basePath);
			const filePath = path.join(this.basePath, filename);
			const jsonData = JSON.stringify(data, null, 2);
			await fs.writeFile(filePath, jsonData, 'utf-8');
		} catch (error) {
			throw new StorageError(`Erro ao escrever arquivo ${filename}: ${(error as Error).message}`);
		}
	}

	/**
	 * Deleta um arquivo
	 */
	async delete(filename: string): Promise<void> {
		try {
			const filePath = path.join(this.basePath, filename);
			await fs.unlink(filePath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				throw new StorageError(`Arquivo ${filename} não encontrado`);
			}
			throw new StorageError(`Erro ao deletar arquivo ${filename}: ${(error as Error).message}`);
		}
	}

	/**
	 * Verifica se um arquivo existe
	 */
	async exists(filename: string): Promise<boolean> {
		try {
			const filePath = path.join(this.basePath, filename);
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Lista todos os arquivos no diretório
	 */
	async list(): Promise<string[]> {
		try {
			await this.ensureDirectory(this.basePath);
			const files = await fs.readdir(this.basePath);
			return files.filter((file) => file.endsWith('.json'));
		} catch (error) {
			throw new StorageError(`Erro ao listar arquivos: ${(error as Error).message}`);
		}
	}

	/**
	 * Lê todos os arquivos JSON no diretório
	 */
	async readAll(): Promise<T[]> {
		const files = await this.list();
		const promises = files.map((file) => this.read(file));
		return Promise.all(promises);
	}
}
