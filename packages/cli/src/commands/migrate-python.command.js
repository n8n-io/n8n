'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.MigratePythonCommand = void 0;
const core_1 = require('@oclif/core');
const core_2 = require('@oclif/core');
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const pyodide_to_local_python_service_1 = require('../migration/pyodide-to-local-python.service');
const pyodide_compat_1 = require('../compatibility/pyodide-compat');
const fs_1 = require('fs');
const path_1 = require('path');
const chalk_1 = __importDefault(require('chalk'));
class MigratePythonCommand extends core_1.Command {
	async run() {
		const { flags } = await this.parse(MigratePythonCommand);
		this.logger = di_1.Container.get(backend_common_1.Logger);
		this.migrationService = di_1.Container.get(
			pyodide_to_local_python_service_1.PyodideToLocalPythonMigrationService,
		);
		this.compatibilityService = di_1.Container.get(pyodide_compat_1.PyodideCompatibilityService);
		this.log(chalk_1.default.blue.bold('🐍 Python Migration Tool'));
		this.log(chalk_1.default.gray('Migrating from Pyodide to local Python execution\n'));
		try {
			if (flags['single-workflow']) {
				await this.migrateSingleWorkflow(flags);
			} else if (flags['analyze-only']) {
				await this.analyzeWorkflows(flags);
			} else {
				await this.migrateBulkWorkflows(flags);
			}
			this.log(chalk_1.default.green.bold('\n✅ Migration completed successfully!'));
		} catch (error) {
			this.log(chalk_1.default.red.bold('\n❌ Migration failed:'));
			this.log(chalk_1.default.red(error instanceof Error ? error.message : String(error)));
			this.exit(1);
		}
	}
	async migrateSingleWorkflow(flags) {
		const workflowPath = flags['single-workflow'];
		this.log(chalk_1.default.yellow(`🔍 Analyzing single workflow: ${workflowPath}`));
		const workflowContent = await fs_1.promises.readFile(workflowPath, 'utf8');
		const workflow = JSON.parse(workflowContent);
		const pyodideNodes = this.findPyodideNodes(workflow);
		if (pyodideNodes.length === 0) {
			this.log(chalk_1.default.yellow('⚠️  No Pyodide Python nodes found in this workflow'));
			return;
		}
		this.log(chalk_1.default.blue(`📊 Found ${pyodideNodes.length} Python node(s) to migrate`));
		const migrationWorkflow = {
			id: workflow.id || 'single-workflow',
			name: workflow.name || 'Single Workflow',
			nodes: pyodideNodes,
		};
		const recommendations =
			await this.migrationService.getMigrationRecommendations(migrationWorkflow);
		this.displayRecommendations(recommendations);
		if (flags['dry-run']) {
			const result = await this.migrationService.dryRunMigration(migrationWorkflow);
			this.displayMigrationResult(result, true);
		} else {
			if (flags.interactive && !(await this.confirmMigration(recommendations))) {
				this.log(chalk_1.default.yellow('Migration cancelled by user'));
				return;
			}
			if (flags.backup) {
				const backupPath = workflowPath + '.backup';
				await fs_1.promises.copyFile(workflowPath, backupPath);
				this.log(chalk_1.default.gray(`📁 Backup created: ${backupPath}`));
			}
			const result = await this.migrationService.migrateWorkflow(migrationWorkflow);
			this.displayMigrationResult(result, false);
			if (result.success) {
				await fs_1.promises.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
				this.log(chalk_1.default.green(`✅ Workflow migrated: ${workflowPath}`));
			}
		}
	}
	async migrateBulkWorkflows(flags) {
		const workflowsPath = flags.workflows;
		this.log(chalk_1.default.yellow(`🔍 Analyzing workflows in: ${workflowsPath}`));
		const analysis = await this.migrationService.analyzeWorkflows(workflowsPath);
		this.log(chalk_1.default.blue(`📊 Analysis Results:`));
		this.log(`  Total workflows: ${analysis.totalWorkflows}`);
		this.log(`  Pyodide workflows: ${analysis.pyodideWorkflows}`);
		this.log(`  Migration candidates: ${analysis.migrationCandidates.length}`);
		this.log(`  Complexity breakdown:`);
		this.log(`    Simple: ${analysis.complexityBreakdown.simple}`);
		this.log(`    Moderate: ${analysis.complexityBreakdown.moderate}`);
		this.log(`    Complex: ${analysis.complexityBreakdown.complex}`);
		this.log(`    Critical: ${analysis.complexityBreakdown.critical}`);
		if (analysis.migrationCandidates.length === 0) {
			this.log(chalk_1.default.yellow('\n⚠️  No workflows require migration'));
			return;
		}
		await fs_1.promises.mkdir(flags.output, { recursive: true });
		let backupDir = null;
		if (flags.backup) {
			backupDir = (0, path_1.join)(flags.output, 'backups');
			await fs_1.promises.mkdir(backupDir, { recursive: true });
		}
		const migrationResults = [];
		for (const workflow of analysis.migrationCandidates) {
			this.log(chalk_1.default.cyan(`\n🔄 Processing workflow: ${workflow.name}`));
			const recommendations = await this.migrationService.getMigrationRecommendations(workflow);
			if (flags.verbose) {
				this.displayRecommendations(recommendations);
			}
			if (recommendations.difficulty === 'critical' && !flags.force) {
				this.log(
					chalk_1.default.red(`⚠️  Skipping critical difficulty workflow (use --force to migrate)`),
				);
				continue;
			}
			if (flags.interactive && !(await this.confirmWorkflowMigration(workflow, recommendations))) {
				this.log(chalk_1.default.yellow('Skipping workflow'));
				continue;
			}
			const result = flags['dry-run']
				? await this.migrationService.dryRunMigration(workflow)
				: await this.migrationService.migrateWorkflow(workflow);
			migrationResults.push(result);
			if (flags.verbose) {
				this.displayMigrationResult(result, flags['dry-run']);
			} else {
				this.log(
					result.success ? chalk_1.default.green('✅ Success') : chalk_1.default.red('❌ Failed'),
				);
			}
			if (!flags['dry-run'] && result.success) {
			}
		}
		this.displayMigrationSummary(migrationResults, flags);
	}
	async analyzeWorkflows(flags) {
		const workflowsPath = flags.workflows;
		this.log(
			chalk_1.default.yellow(`🔍 Analyzing workflows for Pyodide compatibility: ${workflowsPath}`),
		);
		const analysis = await this.migrationService.analyzeWorkflows(workflowsPath);
		const codeSnippets = [];
		for (const workflow of analysis.migrationCandidates) {
			for (const node of workflow.nodes) {
				const code = node.parameters.code || node.parameters.pythonCode || '';
				if (code) {
					codeSnippets.push({
						id: `${workflow.id}-${node.id}`,
						code,
					});
				}
			}
		}
		const compatibilityReport =
			await this.compatibilityService.generateCompatibilityReport(codeSnippets);
		this.displayAnalysisResults(analysis, compatibilityReport, flags);
		const reportPath = (0, path_1.join)(
			flags.output,
			`migration-analysis.${flags['output-format']}`,
		);
		await this.saveAnalysisReport(
			analysis,
			compatibilityReport,
			reportPath,
			flags['output-format'],
		);
		this.log(chalk_1.default.green(`📄 Analysis report saved: ${reportPath}`));
	}
	findPyodideNodes(workflow) {
		const nodes = [];
		if (workflow.nodes && Array.isArray(workflow.nodes)) {
			for (const node of workflow.nodes) {
				if (this.isPyodideNode(node)) {
					nodes.push(node);
				}
			}
		}
		return nodes;
	}
	isPyodideNode(node) {
		return (
			node.type === 'n8n-nodes-base.code' &&
			(node.parameters?.language === 'python' ||
				node.parameters?.pythonCode ||
				(node.parameters?.code && this.containsPythonCode(node.parameters.code)))
		);
	}
	containsPythonCode(code) {
		const pythonPatterns = [
			/^import\s+\w+/m,
			/^from\s+\w+\s+import/m,
			/def\s+\w+\s*\(/,
			/class\s+\w+\s*[\(:]/,
			/print\s*\(/,
		];
		return pythonPatterns.some((pattern) => pattern.test(code));
	}
	displayRecommendations(recommendations) {
		this.log(chalk_1.default.blue.bold('\n📋 Migration Recommendations:'));
		this.log(
			`  Difficulty: ${this.getDifficultyColor(recommendations.difficulty)(recommendations.difficulty)}`,
		);
		this.log(`  Estimated time: ${recommendations.estimatedTime}`);
		if (recommendations.prerequisites.length > 0) {
			this.log(`  Prerequisites: ${recommendations.prerequisites.join(', ')}`);
		}
		if (recommendations.risks.length > 0) {
			this.log(chalk_1.default.yellow('  Risks:'));
			recommendations.risks.forEach((risk) => {
				this.log(chalk_1.default.yellow(`    - ${risk}`));
			});
		}
		this.log(chalk_1.default.green('  Benefits:'));
		recommendations.benefits.forEach((benefit) => {
			this.log(chalk_1.default.green(`    - ${benefit}`));
		});
	}
	displayMigrationResult(result, isDryRun) {
		const prefix = isDryRun ? '[DRY RUN] ' : '';
		this.log(chalk_1.default.blue.bold(`\n${prefix}🔄 Migration Result:`));
		this.log(
			`  Status: ${result.success ? chalk_1.default.green('Success') : chalk_1.default.red('Failed')}`,
		);
		this.log(`  Changes: ${result.changes.length}`);
		this.log(`  Warnings: ${result.warnings.length}`);
		this.log(`  Errors: ${result.errors.length}`);
		if (result.changes.length > 0) {
			this.log(chalk_1.default.blue('  Changes made:'));
			result.changes.forEach((change) => {
				this.log(chalk_1.default.blue(`    - ${change.description} (${change.changeType})`));
			});
		}
		if (result.warnings.length > 0) {
			this.log(chalk_1.default.yellow('  Warnings:'));
			result.warnings.forEach((warning) => {
				this.log(chalk_1.default.yellow(`    - ${warning}`));
			});
		}
		if (result.errors.length > 0) {
			this.log(chalk_1.default.red('  Errors:'));
			result.errors.forEach((error) => {
				this.log(chalk_1.default.red(`    - ${error}`));
			});
		}
	}
	displayMigrationSummary(results, flags) {
		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;
		const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);
		const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
		this.log(chalk_1.default.blue.bold('\n📊 Migration Summary:'));
		this.log(`  Total workflows processed: ${results.length}`);
		this.log(`  Successful migrations: ${chalk_1.default.green(successful)}`);
		this.log(`  Failed migrations: ${chalk_1.default.red(failed)}`);
		this.log(`  Total changes applied: ${totalChanges}`);
		this.log(`  Total warnings: ${totalWarnings}`);
		if (flags['dry-run']) {
			this.log(chalk_1.default.yellow('\n⚠️  This was a dry run - no actual changes were made'));
		}
	}
	displayAnalysisResults(analysis, compatibilityReport, _flags) {
		this.log(chalk_1.default.blue.bold('\n📊 Compatibility Analysis Results:'));
		this.log(
			`  Overall compatibility: ${this.getCompatibilityColor(compatibilityReport.overallCompatibility)}${compatibilityReport.overallCompatibility}%${chalk_1.default.reset()}`,
		);
		this.log(`  Total code snippets analyzed: ${compatibilityReport.summary.total}`);
		this.log(`  Compatible: ${chalk_1.default.green(compatibilityReport.summary.compatible)}`);
		this.log(
			`  Requires changes: ${chalk_1.default.yellow(compatibilityReport.summary.requiresChanges)}`,
		);
		this.log(`  Incompatible: ${chalk_1.default.red(compatibilityReport.summary.incompatible)}`);
		if (compatibilityReport.globalRecommendations.length > 0) {
			this.log(chalk_1.default.blue('\n🎯 Global Recommendations:'));
			compatibilityReport.globalRecommendations.forEach((rec) => {
				this.log(chalk_1.default.blue(`  - ${rec}`));
			});
		}
		this.log(chalk_1.default.blue('\n📈 Complexity Breakdown:'));
		this.log(`  Simple: ${chalk_1.default.green(analysis.complexityBreakdown.simple)}`);
		this.log(`  Moderate: ${chalk_1.default.yellow(analysis.complexityBreakdown.moderate)}`);
		this.log(`  Complex: ${chalk_1.default.yellow(analysis.complexityBreakdown.complex)}`);
		this.log(`  Critical: ${chalk_1.default.red(analysis.complexityBreakdown.critical)}`);
	}
	async saveAnalysisReport(analysis, compatibilityReport, path, format) {
		await fs_1.promises.mkdir((0, path_1.dirname)(path), { recursive: true });
		const reportData = {
			timestamp: new Date().toISOString(),
			analysis,
			compatibility: compatibilityReport,
		};
		let content;
		switch (format) {
			case 'json':
				content = JSON.stringify(reportData, null, 2);
				break;
			case 'yaml':
				content = JSON.stringify(reportData, null, 2);
				break;
			case 'text':
			default:
				content = this.formatTextReport(reportData);
				break;
		}
		await fs_1.promises.writeFile(path, content);
	}
	formatTextReport(data) {
		const lines = [];
		lines.push('Python Migration Analysis Report');
		lines.push('=====================================');
		lines.push(`Generated: ${data.timestamp}`);
		lines.push('');
		lines.push('Workflow Analysis:');
		lines.push(`  Total workflows: ${data.analysis.totalWorkflows}`);
		lines.push(`  Pyodide workflows: ${data.analysis.pyodideWorkflows}`);
		lines.push(`  Migration candidates: ${data.analysis.migrationCandidates.length}`);
		lines.push('');
		lines.push('Compatibility Report:');
		lines.push(`  Overall compatibility: ${data.compatibility.overallCompatibility}%`);
		lines.push(`  Compatible: ${data.compatibility.summary.compatible}`);
		lines.push(`  Requires changes: ${data.compatibility.summary.requiresChanges}`);
		lines.push(`  Incompatible: ${data.compatibility.summary.incompatible}`);
		lines.push('');
		if (data.compatibility.globalRecommendations.length > 0) {
			lines.push('Global Recommendations:');
			data.compatibility.globalRecommendations.forEach((rec) => {
				lines.push(`  - ${rec}`);
			});
			lines.push('');
		}
		return lines.join('\n');
	}
	async confirmMigration(recommendations) {
		const { default: inquirer } = await Promise.resolve().then(() =>
			__importStar(require('inquirer')),
		);
		const answers = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'proceed',
				message: `Proceed with migration? (Difficulty: ${recommendations.difficulty}, Time: ${recommendations.estimatedTime})`,
				default: recommendations.difficulty !== 'critical',
			},
		]);
		return answers.proceed;
	}
	async confirmWorkflowMigration(workflow, recommendations) {
		const { default: inquirer } = await Promise.resolve().then(() =>
			__importStar(require('inquirer')),
		);
		const answers = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'proceed',
				message: `Migrate workflow "${workflow.name}"? (${workflow.nodes.length} nodes, ${recommendations.difficulty} difficulty)`,
				default: recommendations.difficulty !== 'critical',
			},
		]);
		return answers.proceed;
	}
	getDifficultyColor(difficulty) {
		switch (difficulty) {
			case 'easy':
				return chalk_1.default.green;
			case 'moderate':
				return chalk_1.default.yellow;
			case 'hard':
				return chalk_1.default.yellow;
			case 'critical':
				return chalk_1.default.red;
			default:
				return chalk_1.default.gray;
		}
	}
	getCompatibilityColor(percentage) {
		if (percentage >= 80) return chalk_1.default.green;
		if (percentage >= 60) return chalk_1.default.yellow;
		if (percentage >= 40) return chalk_1.default.yellow;
		return chalk_1.default.red;
	}
}
exports.MigratePythonCommand = MigratePythonCommand;
MigratePythonCommand.description =
	'Migrate Python workflows from Pyodide to local Python execution';
MigratePythonCommand.examples = [
	'<%= config.bin %> <%= command.id %> --workflows ./workflows --output ./migrated-workflows',
	'<%= config.bin %> <%= command.id %> --workflows ./workflows --dry-run',
	'<%= config.bin %> <%= command.id %> --workflows ./workflows --analyze-only',
	'<%= config.bin %> <%= command.id %> --single-workflow ./my-workflow.json --backup',
];
MigratePythonCommand.flags = {
	workflows: core_2.Flags.string({
		char: 'w',
		description: 'Path to workflows directory or single workflow file',
		required: true,
	}),
	output: core_2.Flags.string({
		char: 'o',
		description: 'Output directory for migrated workflows',
		default: './migrated-workflows',
	}),
	dryRun: core_2.Flags.boolean({
		char: 'd',
		description: 'Perform a dry run without making changes',
		default: false,
	}),
	analyzeOnly: core_2.Flags.boolean({
		char: 'a',
		description: 'Only analyze workflows and generate compatibility report',
		default: false,
	}),
	backup: core_2.Flags.boolean({
		char: 'b',
		description: 'Create backup of original workflows',
		default: false,
	}),
	singleWorkflow: core_2.Flags.string({
		char: 's',
		description: 'Migrate a single workflow file',
	}),
	force: core_2.Flags.boolean({
		char: 'f',
		description: 'Force migration even with high-risk issues',
		default: false,
	}),
	interactive: core_2.Flags.boolean({
		char: 'i',
		description: 'Interactive mode with prompts for each workflow',
		default: false,
	}),
	outputFormat: core_2.Flags.string({
		description: 'Output format for reports',
		options: ['json', 'yaml', 'text'],
		default: 'text',
	}),
	includePatterns: core_2.Flags.string({
		description: 'Comma-separated patterns to include (e.g., "*.json,workflow-*.json")',
	}),
	excludePatterns: core_2.Flags.string({
		description: 'Comma-separated patterns to exclude',
	}),
	verbose: core_2.Flags.boolean({
		char: 'v',
		description: 'Verbose output',
		default: false,
	}),
};
//# sourceMappingURL=migrate-python.command.js.map
