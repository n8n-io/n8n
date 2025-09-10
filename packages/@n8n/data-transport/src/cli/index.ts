#!/usr/bin/env node

import { Command } from 'commander';
import { ExportCommand } from './export.command';
import { ImportCommand } from './import.command';

const program = new Command();

program
	.name('n8n-data-transport')
	.description('n8n Data Export/Import Tool - CLI for database migration')
	.version('0.1.0')
	.usage('<command> [options]');

// Add export command
const exportCommand = new ExportCommand();
program.addCommand(exportCommand.createCommand());

// Add import command
const importCommand = new ImportCommand();
program.addCommand(importCommand.createCommand());

// Add a status command for fun
program
	.command('status')
	.description('Show current database status')
	.action(() => {
		console.log('📊 n8n Data Transport Status');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('🟢 CLI Tool: Ready');
		console.log('🟢 Export: Available');
		console.log('🟢 Import: Available');
		console.log('🟡 Database: Not connected (dummy mode)');
		console.log('🟡 Encryption: Not implemented (dummy mode)');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('💡 This is a demo CLI with dummy responses');
		console.log('💡 Use --help to see available commands');
	});

// Parse command line arguments
program.parse();

// If no command was provided, show help
if (!process.argv.slice(2).length) {
	console.log('🚀 n8n Data Transport Tool');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	program.outputHelp();
	console.log('\n💡 This is a demo CLI with dummy responses');
	console.log('💡 Try: n8n-data-transport export --all');
	console.log('💡 Or:  n8n-data-transport status');
}
