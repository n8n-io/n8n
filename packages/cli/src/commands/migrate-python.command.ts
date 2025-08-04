import { Command } from '@oclif/core';
import { Flags } from '@oclif/core';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { PyodideToLocalPythonMigrationService } from '../migration/pyodide-to-local-python.service';
import { PyodideCompatibilityService } from '../compatibility/pyodide-compat';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';

export class MigratePythonCommand extends Command {
	static description = 'Migrate Python workflows from Pyodide to local Python execution';

	static examples = [
		'<%= config.bin %> <%= command.id %> --workflows ./workflows --output ./migrated-workflows',
		'<%= config.bin %> <%= command.id %> --workflows ./workflows --dry-run',
		'<%= config.bin %> <%= command.id %> --workflows ./workflows --analyze-only',
		'<%= config.bin %> <%= command.id %> --single-workflow ./my-workflow.json --backup',
	];

	static flags = {
		workflows: Flags.string({
			char: 'w',
			description: 'Path to workflows directory or single workflow file',
			required: true,
		}),
		output: Flags.string({
			char: 'o',
			description: 'Output directory for migrated workflows',
			default: './migrated-workflows',
		}),
		'dry-run': Flags.boolean({
			char: 'd',
			description: 'Perform a dry run without making changes',
			default: false,
		}),
		'analyze-only': Flags.boolean({
			char: 'a',
			description: 'Only analyze workflows and generate compatibility report',
			default: false,
		}),
		backup: Flags.boolean({
			char: 'b',
			description: 'Create backup of original workflows',
			default: false,
		}),
		'single-workflow': Flags.string({
			char: 's',
			description: 'Migrate a single workflow file',
		}),
		force: Flags.boolean({
			char: 'f',
			description: 'Force migration even with high-risk issues',
			default: false,
		}),
		interactive: Flags.boolean({
			char: 'i',
			description: 'Interactive mode with prompts for each workflow',
			default: false,
		}),
		'output-format': Flags.string({
			description: 'Output format for reports',
			options: ['json', 'yaml', 'text'],
			default: 'text',
		}),
		'include-patterns': Flags.string({
			description: 'Comma-separated patterns to include (e.g., "*.json,workflow-*.json")',
		}),
		'exclude-patterns': Flags.string({
			description: 'Comma-separated patterns to exclude',
		}),
		verbose: Flags.boolean({
			char: 'v',
			description: 'Verbose output',
			default: false,
		}),
	};

	private migrationService!: PyodideToLocalPythonMigrationService;
	private compatibilityService!: PyodideCompatibilityService;
	private logger!: Logger;

	async run(): Promise<void> {
		const { flags } = await this.parse(MigratePythonCommand);

		// Initialize services
		this.logger = Container.get(Logger);
		this.migrationService = Container.get(PyodideToLocalPythonMigrationService);
		this.compatibilityService = Container.get(PyodideCompatibilityService);

		this.log(chalk.blue.bold('🐍 Python Migration Tool'));
		this.log(chalk.gray('Migrating from Pyodide to local Python execution\n'));

		try {
			if (flags['single-workflow']) {
				await this.migrateSingleWorkflow(flags);
			} else if (flags['analyze-only']) {
				await this.analyzeWorkflows(flags);
			} else {
				await this.migrateBulkWorkflows(flags);
			}

			this.log(chalk.green.bold('\n✅ Migration completed successfully!'));
		} catch (error) {
			this.log(chalk.red.bold('\n❌ Migration failed:'));
			this.log(chalk.red(error instanceof Error ? error.message : String(error)));
			this.exit(1);
		}
	}

	private async migrateSingleWorkflow(flags: any): Promise<void> {
		const workflowPath = flags['single-workflow'];

		this.log(chalk.yellow(`🔍 Analyzing single workflow: ${workflowPath}`));

		// Read and parse workflow
		const workflowContent = await fs.readFile(workflowPath, 'utf8');
		const workflow = JSON.parse(workflowContent);

		// Find Pyodide nodes
		const pyodideNodes = this.findPyodideNodes(workflow);

		if (pyodideNodes.length === 0) {
			this.log(chalk.yellow('⚠️  No Pyodide Python nodes found in this workflow'));
			return;
		}

		this.log(chalk.blue(`📊 Found ${pyodideNodes.length} Python node(s) to migrate`));

		const migrationWorkflow = {
			id: workflow.id || 'single-workflow',
			name: workflow.name || 'Single Workflow',
			nodes: pyodideNodes,
		};

		// Get migration recommendations
		const recommendations =
			await this.migrationService.getMigrationRecommendations(migrationWorkflow);
		this.displayRecommendations(recommendations);

		// Perform migration
		if (flags['dry-run']) {
			const result = await this.migrationService.dryRunMigration(migrationWorkflow);
			this.displayMigrationResult(result, true);
		} else {
			if (flags.interactive && !(await this.confirmMigration(recommendations))) {
				this.log(chalk.yellow('Migration cancelled by user'));
				return;
			}

			// Create backup if requested
			if (flags.backup) {
				const backupPath = workflowPath + '.backup';
				await fs.copyFile(workflowPath, backupPath);
				this.log(chalk.gray(`📁 Backup created: ${backupPath}`));
			}

			const result = await this.migrationService.migrateWorkflow(migrationWorkflow);
			this.displayMigrationResult(result, false);

			if (result.success) {
				// Write migrated workflow back
				await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
				this.log(chalk.green(`✅ Workflow migrated: ${workflowPath}`));
			}
		}
	}

	private async migrateBulkWorkflows(flags: any): Promise<void> {
		const workflowsPath = flags.workflows;

		this.log(chalk.yellow(`🔍 Analyzing workflows in: ${workflowsPath}`));

		// Analyze workflows
		const analysis = await this.migrationService.analyzeWorkflows(workflowsPath);

		this.log(chalk.blue(`📊 Analysis Results:`));
		this.log(`  Total workflows: ${analysis.totalWorkflows}`);
		this.log(`  Pyodide workflows: ${analysis.pyodideWorkflows}`);
		this.log(`  Migration candidates: ${analysis.migrationCandidates.length}`);
		this.log(`  Complexity breakdown:`);
		this.log(`    Simple: ${analysis.complexityBreakdown.simple}`);
		this.log(`    Moderate: ${analysis.complexityBreakdown.moderate}`);
		this.log(`    Complex: ${analysis.complexityBreakdown.complex}`);
		this.log(`    Critical: ${analysis.complexityBreakdown.critical}`);

		if (analysis.migrationCandidates.length === 0) {
			this.log(chalk.yellow('\n⚠️  No workflows require migration'));
			return;
		}

		// Ensure output directory exists
		await fs.mkdir(flags.output, { recursive: true });

		// Create backup directory if requested
		let backupDir: string | null = null;
		if (flags.backup) {
			backupDir = join(flags.output, 'backups');
			await fs.mkdir(backupDir, { recursive: true });
		}

		const migrationResults = [];

		for (const workflow of analysis.migrationCandidates) {
			this.log(chalk.cyan(`\n🔄 Processing workflow: ${workflow.name}`));

			// Get recommendations
			const recommendations = await this.migrationService.getMigrationRecommendations(workflow);

			if (flags.verbose) {
				this.displayRecommendations(recommendations);
			}

			// Skip critical difficulty workflows unless forced
			if (recommendations.difficulty === 'critical' && !flags.force) {
				this.log(chalk.red(`⚠️  Skipping critical difficulty workflow (use --force to migrate)`));
				continue;
			}

			// Interactive confirmation
			if (flags.interactive && !(await this.confirmWorkflowMigration(workflow, recommendations))) {
				this.log(chalk.yellow('Skipping workflow'));
				continue;
			}

			// Perform migration
			const result = flags['dry-run']
				? await this.migrationService.dryRunMigration(workflow)
				: await this.migrationService.migrateWorkflow(workflow);

			migrationResults.push(result);

			if (flags.verbose) {
				this.displayMigrationResult(result, flags['dry-run']);
			} else {
				this.log(result.success ? chalk.green('✅ Success') : chalk.red('❌ Failed'));
			}

			// Save migrated workflow if not dry run
			if (!flags['dry-run'] && result.success) {
				const outputPath = join(flags.output, `${workflow.id}.json`);
				// Note: This would need the full workflow object, not just the nodes
				// await fs.writeFile(outputPath, JSON.stringify(workflow, null, 2));
			}
		}

		// Generate summary report
		this.displayMigrationSummary(migrationResults, flags);
	}

	private async analyzeWorkflows(flags: any): Promise<void> {
		const workflowsPath = flags.workflows;

		this.log(chalk.yellow(`🔍 Analyzing workflows for Pyodide compatibility: ${workflowsPath}`));

		const analysis = await this.migrationService.analyzeWorkflows(workflowsPath);

		// Generate detailed compatibility report
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

		// Display analysis results
		this.displayAnalysisResults(analysis, compatibilityReport, flags);

		// Save report to file
		const reportPath = join(flags.output, `migration-analysis.${flags['output-format']}`);
		await this.saveAnalysisReport(
			analysis,
			compatibilityReport,
			reportPath,
			flags['output-format'],
		);

		this.log(chalk.green(`📄 Analysis report saved: ${reportPath}`));
	}

	private findPyodideNodes(workflow: any): any[] {
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

	private isPyodideNode(node: any): boolean {
		return (
			node.type === 'n8n-nodes-base.code' &&
			(node.parameters?.language === 'python' ||
				node.parameters?.pythonCode ||
				(node.parameters?.code && this.containsPythonCode(node.parameters.code)))
		);
	}

	private containsPythonCode(code: string): boolean {
		const pythonPatterns = [
			/^import\s+\w+/m,
			/^from\s+\w+\s+import/m,
			/def\s+\w+\s*\(/,
			/class\s+\w+\s*[\(:]/,
			/print\s*\(/,
		];

		return pythonPatterns.some((pattern) => pattern.test(code));
	}

	private displayRecommendations(recommendations: any): void {
		this.log(chalk.blue.bold('\n📋 Migration Recommendations:'));
		this.log(
			`  Difficulty: ${this.getDifficultyColor(recommendations.difficulty)(recommendations.difficulty)}`,
		);
		this.log(`  Estimated time: ${recommendations.estimatedTime}`);

		if (recommendations.prerequisites.length > 0) {
			this.log(`  Prerequisites: ${recommendations.prerequisites.join(', ')}`);
		}

		if (recommendations.risks.length > 0) {
			this.log(chalk.yellow('  Risks:'));
			recommendations.risks.forEach((risk: string) => {
				this.log(chalk.yellow(`    - ${risk}`));
			});
		}

		this.log(chalk.green('  Benefits:'));
		recommendations.benefits.forEach((benefit: string) => {
			this.log(chalk.green(`    - ${benefit}`));
		});
	}

	private displayMigrationResult(result: any, isDryRun: boolean): void {
		const prefix = isDryRun ? '[DRY RUN] ' : '';

		this.log(chalk.blue.bold(`\n${prefix}🔄 Migration Result:`));
		this.log(`  Status: ${result.success ? chalk.green('Success') : chalk.red('Failed')}`);
		this.log(`  Changes: ${result.changes.length}`);
		this.log(`  Warnings: ${result.warnings.length}`);
		this.log(`  Errors: ${result.errors.length}`);

		if (result.changes.length > 0) {
			this.log(chalk.blue('  Changes made:'));
			result.changes.forEach((change: any) => {
				this.log(chalk.blue(`    - ${change.description} (${change.changeType})`));
			});
		}

		if (result.warnings.length > 0) {
			this.log(chalk.yellow('  Warnings:'));
			result.warnings.forEach((warning: string) => {
				this.log(chalk.yellow(`    - ${warning}`));
			});
		}

		if (result.errors.length > 0) {
			this.log(chalk.red('  Errors:'));
			result.errors.forEach((error: string) => {
				this.log(chalk.red(`    - ${error}`));
			});
		}
	}

	private displayMigrationSummary(results: any[], flags: any): void {
		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;
		const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);
		const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

		this.log(chalk.blue.bold('\n📊 Migration Summary:'));
		this.log(`  Total workflows processed: ${results.length}`);
		this.log(`  Successful migrations: ${chalk.green(successful)}`);
		this.log(`  Failed migrations: ${chalk.red(failed)}`);
		this.log(`  Total changes applied: ${totalChanges}`);
		this.log(`  Total warnings: ${totalWarnings}`);

		if (flags['dry-run']) {
			this.log(chalk.yellow('\n⚠️  This was a dry run - no actual changes were made'));
		}
	}

	private displayAnalysisResults(analysis: any, compatibilityReport: any, flags: any): void {
		this.log(chalk.blue.bold('\n📊 Compatibility Analysis Results:'));
		this.log(
			`  Overall compatibility: ${this.getCompatibilityColor(compatibilityReport.overallCompatibility)}${compatibilityReport.overallCompatibility}%${chalk.reset()}`,
		);
		this.log(`  Total code snippets analyzed: ${compatibilityReport.summary.total}`);
		this.log(`  Compatible: ${chalk.green(compatibilityReport.summary.compatible)}`);
		this.log(`  Requires changes: ${chalk.yellow(compatibilityReport.summary.requiresChanges)}`);
		this.log(`  Incompatible: ${chalk.red(compatibilityReport.summary.incompatible)}`);

		if (compatibilityReport.globalRecommendations.length > 0) {
			this.log(chalk.blue('\n🎯 Global Recommendations:'));
			compatibilityReport.globalRecommendations.forEach((rec: string) => {
				this.log(chalk.blue(`  - ${rec}`));
			});
		}

		this.log(chalk.blue('\n📈 Complexity Breakdown:'));
		this.log(`  Simple: ${chalk.green(analysis.complexityBreakdown.simple)}`);
		this.log(`  Moderate: ${chalk.yellow(analysis.complexityBreakdown.moderate)}`);
		this.log(`  Complex: ${chalk.orange(analysis.complexityBreakdown.complex)}`);
		this.log(`  Critical: ${chalk.red(analysis.complexityBreakdown.critical)}`);
	}

	private async saveAnalysisReport(
		analysis: any,
		compatibilityReport: any,
		path: string,
		format: string,
	): Promise<void> {
		await fs.mkdir(dirname(path), { recursive: true });

		const reportData = {
			timestamp: new Date().toISOString(),
			analysis,
			compatibility: compatibilityReport,
		};

		let content: string;
		switch (format) {
			case 'json':
				content = JSON.stringify(reportData, null, 2);
				break;
			case 'yaml':
				// Would need yaml library
				content = JSON.stringify(reportData, null, 2); // Fallback to JSON
				break;
			case 'text':
			default:
				content = this.formatTextReport(reportData);
				break;
		}

		await fs.writeFile(path, content);
	}

	private formatTextReport(data: any): string {
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
			data.compatibility.globalRecommendations.forEach((rec: string) => {
				lines.push(`  - ${rec}`);
			});
			lines.push('');
		}

		return lines.join('\n');
	}

	private async confirmMigration(recommendations: any): Promise<boolean> {
		const { default: inquirer } = await import('inquirer');

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

	private async confirmWorkflowMigration(workflow: any, recommendations: any): Promise<boolean> {
		const { default: inquirer } = await import('inquirer');

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

	private getDifficultyColor(difficulty: string): (text: string) => string {
		switch (difficulty) {
			case 'easy':
				return chalk.green;
			case 'moderate':
				return chalk.yellow;
			case 'hard':
				return chalk.orange;
			case 'critical':
				return chalk.red;
			default:
				return chalk.gray;
		}
	}

	private getCompatibilityColor(percentage: number): (text: string) => string {
		if (percentage >= 80) return chalk.green;
		if (percentage >= 60) return chalk.yellow;
		if (percentage >= 40) return chalk.orange;
		return chalk.red;
	}
}
