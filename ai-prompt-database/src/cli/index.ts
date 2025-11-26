#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import {
	createCommand,
	listCommand,
	showCommand,
	searchCommand,
	updateCommand,
	deleteCommand,
	exportCommand,
	importCommand,
	categoriesCommand,
	tagsCommand,
	versionsCommand,
} from './commands.js';

const program = new Command();

program
	.name('ai-prompts')
	.description('Base de dados de prompts de IA - CLI')
	.version('1.0.0');

// Comando: create
program
	.command('create')
	.description('Criar um novo prompt')
	.action(async () => {
		try {
			await createCommand();
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: list
program
	.command('list')
	.description('Listar todos os prompts')
	.action(async () => {
		try {
			await listCommand();
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: show
program
	.command('show <id>')
	.description('Mostrar detalhes de um prompt')
	.action(async (id: string) => {
		try {
			await showCommand(id);
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: search
program
	.command('search <query>')
	.description('Buscar prompts por texto')
	.action(async (query: string) => {
		try {
			await searchCommand(query);
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: update
program
	.command('update <id>')
	.description('Atualizar um prompt existente')
	.action(async (id: string) => {
		try {
			await updateCommand(id);
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: delete
program
	.command('delete <id>')
	.alias('rm')
	.description('Deletar um prompt')
	.action(async (id: string) => {
		try {
			await deleteCommand(id);
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: export
program
	.command('export <id> <file>')
	.description('Exportar um prompt para arquivo JSON')
	.action(async (id: string, file: string) => {
		try {
			await exportCommand(id, file);
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: import
program
	.command('import <file>')
	.description('Importar prompts de um arquivo JSON')
	.action(async (file: string) => {
		try {
			await importCommand(file);
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: categories
program
	.command('categories')
	.description('Listar todas as categorias')
	.action(async () => {
		try {
			await categoriesCommand();
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: tags
program
	.command('tags')
	.description('Listar todas as tags')
	.action(async () => {
		try {
			await tagsCommand();
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Comando: versions
program
	.command('versions <id>')
	.description('Listar versões de um prompt')
	.action(async (id: string) => {
		try {
			await versionsCommand(id);
		} catch (error) {
			console.error(chalk.red.bold('\n❌ Erro:'), (error as Error).message);
			process.exit(1);
		}
	});

// Banner de ajuda customizado
program.on('--help', () => {
	console.log('');
	console.log(chalk.blue.bold('Exemplos de uso:'));
	console.log('');
	console.log(chalk.gray('  $ ai-prompts create              # Criar novo prompt'));
	console.log(chalk.gray('  $ ai-prompts list                # Listar todos os prompts'));
	console.log(chalk.gray('  $ ai-prompts search "chatbot"    # Buscar prompts'));
	console.log(chalk.gray('  $ ai-prompts show <id>           # Ver detalhes'));
	console.log(chalk.gray('  $ ai-prompts update <id>         # Atualizar prompt'));
	console.log(chalk.gray('  $ ai-prompts delete <id>         # Deletar prompt'));
	console.log(chalk.gray('  $ ai-prompts export <id> file.json  # Exportar'));
	console.log(chalk.gray('  $ ai-prompts import file.json       # Importar'));
	console.log('');
});

// Parse dos argumentos
program.parse(process.argv);

// Se nenhum comando for passado, mostra ajuda
if (!process.argv.slice(2).length) {
	program.outputHelp();
}
