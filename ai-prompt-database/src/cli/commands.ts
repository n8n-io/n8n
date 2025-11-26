import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
	PromptService,
	CategoryService,
	SearchService,
	ShareService,
} from '../services/index.js';
import { CreatePromptData, UpdatePromptData, PromptParameter } from '../models/index.js';

const promptService = new PromptService();
const categoryService = new CategoryService();
const searchService = new SearchService();
const shareService = new ShareService();

/**
 * Formata data para exibição
 */
function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleString('pt-BR');
}

/**
 * Comando: create - Criar novo prompt
 */
export async function createCommand(): Promise<void> {
	console.log(chalk.blue.bold('\n📝 Criar Novo Prompt\n'));

	const answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'name',
			message: 'Nome do prompt:',
			validate: (input: string) => (input.trim() ? true : 'Nome é obrigatório'),
		},
		{
			type: 'input',
			name: 'description',
			message: 'Descrição:',
		},
		{
			type: 'editor',
			name: 'content',
			message: 'Conteúdo do prompt (abrirá um editor):',
		},
		{
			type: 'input',
			name: 'category',
			message: 'Categoria:',
			validate: (input: string) => (input.trim() ? true : 'Categoria é obrigatória'),
		},
		{
			type: 'input',
			name: 'tags',
			message: 'Tags (separadas por vírgula):',
		},
		{
			type: 'input',
			name: 'aiModel',
			message: 'Modelo de IA (ex: gpt-4, claude-3):',
			validate: (input: string) => (input.trim() ? true : 'Modelo de IA é obrigatório'),
		},
		{
			type: 'input',
			name: 'author',
			message: 'Autor:',
			default: 'unknown',
		},
		{
			type: 'confirm',
			name: 'shared',
			message: 'Compartilhar este prompt?',
			default: false,
		},
	]);

	const data: CreatePromptData = {
		name: answers.name,
		description: answers.description,
		content: answers.content,
		category: answers.category,
		tags: answers.tags ? answers.tags.split(',').map((t: string) => t.trim()) : [],
		aiModel: answers.aiModel,
		author: answers.author,
		shared: answers.shared,
	};

	const prompt = await promptService.createPrompt(data);
	console.log(chalk.green.bold('\n✅ Prompt criado com sucesso!'));
	console.log(chalk.gray(`ID: ${prompt.id}`));
}

/**
 * Comando: list - Listar todos os prompts
 */
export async function listCommand(): Promise<void> {
	const prompts = await promptService.listAllPrompts();

	if (prompts.length === 0) {
		console.log(chalk.yellow('\n⚠️  Nenhum prompt encontrado'));
		return;
	}

	console.log(chalk.blue.bold(`\n📚 Total de prompts: ${prompts.length}\n`));

	for (const prompt of prompts) {
		console.log(chalk.cyan.bold(prompt.name));
		console.log(chalk.gray(`  ID: ${prompt.id}`));
		console.log(chalk.gray(`  Categoria: ${prompt.category}`));
		console.log(chalk.gray(`  Tags: ${prompt.tags.join(', ') || 'Nenhuma'}`));
		console.log(chalk.gray(`  Modelo: ${prompt.aiModel}`));
		console.log(chalk.gray(`  Atualizado: ${formatDate(prompt.updatedAt)}`));
		console.log();
	}
}

/**
 * Comando: show - Mostrar detalhes de um prompt
 */
export async function showCommand(id: string): Promise<void> {
	const prompt = await promptService.getPromptById(id);

	console.log(chalk.blue.bold('\n📄 Detalhes do Prompt\n'));
	console.log(chalk.cyan.bold(`Nome: ${prompt.name}`));
	console.log(chalk.gray(`ID: ${prompt.id}`));
	console.log(chalk.gray(`Descrição: ${prompt.description}`));
	console.log(chalk.gray(`Categoria: ${prompt.category}`));
	console.log(chalk.gray(`Tags: ${prompt.tags.join(', ') || 'Nenhuma'}`));
	console.log(chalk.gray(`Modelo de IA: ${prompt.aiModel}`));
	console.log(chalk.gray(`Autor: ${prompt.author}`));
	console.log(chalk.gray(`Versão: ${prompt.version}`));
	console.log(chalk.gray(`Compartilhado: ${prompt.shared ? 'Sim' : 'Não'}`));
	console.log(chalk.gray(`Criado: ${formatDate(prompt.createdAt)}`));
	console.log(chalk.gray(`Atualizado: ${formatDate(prompt.updatedAt)}`));
	console.log(chalk.white.bold('\nConteúdo:'));
	console.log(chalk.white(prompt.content));

	if (prompt.parameters.length > 0) {
		console.log(chalk.white.bold('\nParâmetros:'));
		for (const param of prompt.parameters) {
			console.log(
				chalk.gray(
					`  - ${param.name} (${param.type})${param.required ? ' *obrigatório*' : ''}: ${param.description}`,
				),
			);
		}
	}
}

/**
 * Comando: search - Buscar prompts
 */
export async function searchCommand(query: string): Promise<void> {
	const prompts = await searchService.quickSearch(query);

	if (prompts.length === 0) {
		console.log(chalk.yellow(`\n⚠️  Nenhum prompt encontrado para "${query}"`));
		return;
	}

	console.log(chalk.blue.bold(`\n🔍 Encontrados ${prompts.length} prompts\n`));

	for (const prompt of prompts) {
		console.log(chalk.cyan.bold(prompt.name));
		console.log(chalk.gray(`  ID: ${prompt.id}`));
		console.log(chalk.gray(`  Categoria: ${prompt.category}`));
		console.log(chalk.gray(`  Descrição: ${prompt.description.substring(0, 100)}...`));
		console.log();
	}
}

/**
 * Comando: update - Atualizar prompt
 */
export async function updateCommand(id: string): Promise<void> {
	const existingPrompt = await promptService.getPromptById(id);

	console.log(chalk.blue.bold('\n✏️  Atualizar Prompt\n'));
	console.log(chalk.gray('Deixe em branco para manter o valor atual\n'));

	const answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'name',
			message: 'Nome do prompt:',
			default: existingPrompt.name,
		},
		{
			type: 'input',
			name: 'description',
			message: 'Descrição:',
			default: existingPrompt.description,
		},
		{
			type: 'confirm',
			name: 'editContent',
			message: 'Deseja editar o conteúdo?',
			default: false,
		},
		{
			type: 'editor',
			name: 'content',
			message: 'Conteúdo do prompt:',
			default: existingPrompt.content,
			when: (answers: { editContent: boolean }) => answers.editContent,
		},
		{
			type: 'input',
			name: 'category',
			message: 'Categoria:',
			default: existingPrompt.category,
		},
		{
			type: 'input',
			name: 'tags',
			message: 'Tags (separadas por vírgula):',
			default: existingPrompt.tags.join(', '),
		},
		{
			type: 'input',
			name: 'aiModel',
			message: 'Modelo de IA:',
			default: existingPrompt.aiModel,
		},
	]);

	const data: UpdatePromptData = {
		name: answers.name,
		description: answers.description,
		content: answers.content || existingPrompt.content,
		category: answers.category,
		tags: answers.tags.split(',').map((t: string) => t.trim()),
		aiModel: answers.aiModel,
	};

	await promptService.updatePrompt(id, data, 'cli');
	console.log(chalk.green.bold('\n✅ Prompt atualizado com sucesso!'));
}

/**
 * Comando: delete - Deletar prompt
 */
export async function deleteCommand(id: string): Promise<void> {
	const prompt = await promptService.getPromptById(id);

	const { confirm } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'confirm',
			message: `Tem certeza que deseja deletar o prompt "${prompt.name}"?`,
			default: false,
		},
	]);

	if (!confirm) {
		console.log(chalk.yellow('\n❌ Operação cancelada'));
		return;
	}

	await promptService.deletePrompt(id);
	console.log(chalk.green.bold('\n✅ Prompt deletado com sucesso!'));
}

/**
 * Comando: export - Exportar prompt
 */
export async function exportCommand(id: string, filePath: string): Promise<void> {
	await shareService.exportPrompt(id, filePath);
	console.log(chalk.green.bold(`\n✅ Prompt exportado para ${filePath}`));
}

/**
 * Comando: import - Importar prompts
 */
export async function importCommand(filePath: string): Promise<void> {
	const prompts = await shareService.importPrompts(filePath);
	console.log(chalk.green.bold(`\n✅ ${prompts.length} prompts importados com sucesso!`));
}

/**
 * Comando: categories - Listar categorias
 */
export async function categoriesCommand(): Promise<void> {
	const categories = await categoryService.listCategories();
	const stats = await categoryService.getCategoryStats();

	console.log(chalk.blue.bold('\n📁 Categorias\n'));

	for (const category of categories) {
		console.log(chalk.cyan(`  ${category} (${stats[category]} prompts)`));
	}
}

/**
 * Comando: tags - Listar tags
 */
export async function tagsCommand(): Promise<void> {
	const tags = await categoryService.listTags();
	const stats = await categoryService.getTagStats();

	console.log(chalk.blue.bold('\n🏷️  Tags\n'));

	for (const tag of tags) {
		console.log(chalk.cyan(`  ${tag} (${stats[tag]} prompts)`));
	}
}

/**
 * Comando: versions - Listar versões de um prompt
 */
export async function versionsCommand(id: string): Promise<void> {
	const versions = await promptService.getPromptVersions(id);

	if (versions.length === 0) {
		console.log(chalk.yellow('\n⚠️  Nenhuma versão encontrada'));
		return;
	}

	console.log(chalk.blue.bold(`\n📜 Versões do Prompt (${versions.length})\n`));

	for (const version of versions) {
		console.log(chalk.cyan.bold(`Versão ${version.version}`));
		console.log(chalk.gray(`  Alterado em: ${formatDate(version.changedAt)}`));
		console.log(chalk.gray(`  Alterado por: ${version.changedBy}`));
		if (version.changeDescription) {
			console.log(chalk.gray(`  Descrição: ${version.changeDescription}`));
		}
		console.log();
	}
}
