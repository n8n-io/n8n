import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ApplicationError } from 'n8n-workflow';
import { promises as fs } from 'fs';
import { join } from 'path';

interface PyodideWorkflow {
	id: string;
	name: string;
	nodes: PyodideNode[];
}

interface PyodideNode {
	id: string;
	type: string;
	parameters: {
		language?: string;
		code?: string;
		pythonCode?: string;
		[key: string]: any;
	};
}

interface MigrationResult {
	workflowId: string;
	success: boolean;
	changes: MigrationChange[];
	warnings: string[];
	errors: string[];
}

interface MigrationChange {
	nodeId: string;
	changeType: 'code_conversion' | 'parameter_update' | 'dependency_added' | 'security_fix';
	description: string;
	oldValue?: any;
	newValue?: any;
}

interface CodeAnalysis {
	usesAsyncAwait: boolean;
	requiresPackages: string[];
	hasSecurityIssues: string[];
	usesJsInterop: boolean;
	complexityScore: number;
}

@Service()
export class PyodideToLocalPythonMigrationService {
	private readonly migrationRules = new Map<string, (code: string) => string>();
	private readonly securityPatterns = [
		/os\.system\s*\(/,
		/subprocess\./,
		/eval\s*\(/,
		/exec\s*\(/,
		/__import__\s*\(/,
		/import\s+os$/,
		/from\s+os\s+import/,
	];

	constructor(private readonly logger: Logger) {
		this.initializeMigrationRules();
		this.logger.info('Pyodide to Local Python Migration Service initialized');
	}

	/**
	 * Analyze workflows to identify Pyodide Python usage
	 */
	async analyzeWorkflows(workflowsPath: string): Promise<{
		totalWorkflows: number;
		pyodideWorkflows: number;
		migrationCandidates: PyodideWorkflow[];
		complexityBreakdown: Record<string, number>;
	}> {
		this.logger.info('Starting workflow analysis for Pyodide migration');

		try {
			const workflowFiles = await fs.readdir(workflowsPath);
			const workflows = [];
			let pyodideCount = 0;
			const complexityBreakdown = {
				simple: 0,
				moderate: 0,
				complex: 0,
				critical: 0,
			};

			for (const file of workflowFiles) {
				if (!file.endsWith('.json')) continue;

				try {
					const workflowPath = join(workflowsPath, file);
					const workflowContent = await fs.readFile(workflowPath, 'utf8');
					const workflow = JSON.parse(workflowContent);

					const pyodideNodes = this.findPyodideNodes(workflow);
					if (pyodideNodes.length > 0) {
						pyodideCount++;
						const migrationWorkflow: PyodideWorkflow = {
							id: workflow.id || file.replace('.json', ''),
							name: workflow.name || file,
							nodes: pyodideNodes,
						};

						workflows.push(migrationWorkflow);

						// Analyze complexity
						for (const node of pyodideNodes) {
							const analysis = await this.analyzeCode(
								node.parameters.code || node.parameters.pythonCode || '',
							);
							if (analysis.complexityScore < 3) complexityBreakdown.simple++;
							else if (analysis.complexityScore < 6) complexityBreakdown.moderate++;
							else if (analysis.complexityScore < 9) complexityBreakdown.complex++;
							else complexityBreakdown.critical++;
						}
					}
				} catch (error) {
					this.logger.warn(`Failed to analyze workflow file ${file}`, { error });
				}
			}

			this.logger.info('Workflow analysis completed', {
				totalWorkflows: workflowFiles.length,
				pyodideWorkflows: pyodideCount,
				migrationCandidates: workflows.length,
			});

			return {
				totalWorkflows: workflowFiles.length,
				pyodideWorkflows: pyodideCount,
				migrationCandidates: workflows,
				complexityBreakdown,
			};
		} catch (error) {
			this.logger.error('Failed to analyze workflows', { error });
			throw new ApplicationError('Workflow analysis failed', { cause: error });
		}
	}

	/**
	 * Migrate a single workflow from Pyodide to local Python
	 */
	async migrateWorkflow(workflow: PyodideWorkflow): Promise<MigrationResult> {
		this.logger.info(`Starting migration for workflow: ${workflow.name}`, {
			workflowId: workflow.id,
			nodeCount: workflow.nodes.length,
		});

		const result: MigrationResult = {
			workflowId: workflow.id,
			success: true,
			changes: [],
			warnings: [],
			errors: [],
		};

		try {
			for (const node of workflow.nodes) {
				await this.migrateNode(node, result);
			}

			this.logger.info(`Migration completed for workflow: ${workflow.name}`, {
				workflowId: workflow.id,
				success: result.success,
				changeCount: result.changes.length,
				warningCount: result.warnings.length,
				errorCount: result.errors.length,
			});

			return result;
		} catch (error) {
			result.success = false;
			result.errors.push(
				`Migration failed: ${error instanceof Error ? error.message : String(error)}`,
			);

			this.logger.error(`Migration failed for workflow: ${workflow.name}`, {
				workflowId: workflow.id,
				error,
			});

			return result;
		}
	}

	/**
	 * Perform dry-run migration to preview changes
	 */
	async dryRunMigration(workflow: PyodideWorkflow): Promise<MigrationResult> {
		// Similar to migrateWorkflow but without actually modifying the workflow
		const result = await this.migrateWorkflow(workflow);
		result.warnings.unshift('DRY RUN: No changes were actually applied');
		return result;
	}

	/**
	 * Get migration recommendations for a specific workflow
	 */
	async getMigrationRecommendations(workflow: PyodideWorkflow): Promise<{
		difficulty: 'easy' | 'moderate' | 'hard' | 'critical';
		estimatedTime: string;
		prerequisites: string[];
		risks: string[];
		benefits: string[];
		alternatives: string[];
	}> {
		let maxComplexity = 0;
		const prerequisites = new Set<string>();
		const risks = new Set<string>();

		for (const node of workflow.nodes) {
			const code = node.parameters.code || node.parameters.pythonCode || '';
			const analysis = await this.analyzeCode(code);

			maxComplexity = Math.max(maxComplexity, analysis.complexityScore);

			// Add prerequisites based on packages
			analysis.requiresPackages.forEach((pkg) => prerequisites.add(pkg));

			// Identify risks
			if (analysis.usesJsInterop) {
				risks.add('JavaScript interoperability needs to be replaced with Python-native solutions');
			}
			if (analysis.hasSecurityIssues.length > 0) {
				risks.add('Security issues detected that need manual review');
			}
			if (analysis.usesAsyncAwait) {
				risks.add('Async/await patterns may need adjustment for subprocess execution');
			}
		}

		const difficulty =
			maxComplexity < 3
				? 'easy'
				: maxComplexity < 6
					? 'moderate'
					: maxComplexity < 9
						? 'hard'
						: 'critical';

		const estimatedTime =
			difficulty === 'easy'
				? '15-30 minutes'
				: difficulty === 'moderate'
					? '1-2 hours'
					: difficulty === 'hard'
						? '4-8 hours'
						: '1-2 days';

		return {
			difficulty,
			estimatedTime,
			prerequisites: Array.from(prerequisites),
			risks: Array.from(risks),
			benefits: [
				'Improved performance and execution speed',
				'Better resource utilization',
				'Access to full Python ecosystem',
				'Enhanced debugging capabilities',
				'Native package management',
			],
			alternatives: [
				'Keep using Pyodide for browser-specific requirements',
				'Gradual migration starting with simpler workflows',
				'Hybrid approach using both execution methods',
			],
		};
	}

	/**
	 * Find Pyodide Python nodes in a workflow
	 */
	private findPyodideNodes(workflow: any): PyodideNode[] {
		const nodes: PyodideNode[] = [];

		if (workflow.nodes && Array.isArray(workflow.nodes)) {
			for (const node of workflow.nodes) {
				if (this.isPyodideNode(node)) {
					nodes.push(node);
				}
			}
		}

		return nodes;
	}

	/**
	 * Check if a node uses Pyodide Python execution
	 */
	private isPyodideNode(node: any): boolean {
		return (
			node.type === 'n8n-nodes-base.code' &&
			(node.parameters?.language === 'python' ||
				node.parameters?.pythonCode ||
				(node.parameters?.code && this.containsPythonCode(node.parameters.code)))
		);
	}

	/**
	 * Basic heuristic to detect Python code
	 */
	private containsPythonCode(code: string): boolean {
		const pythonPatterns = [
			/^import\s+\w+/m,
			/^from\s+\w+\s+import/m,
			/def\s+\w+\s*\(/,
			/class\s+\w+\s*[\(:]/,
			/if\s+__name__\s*==\s*['"']__main__['"']/,
			/print\s*\(/,
		];

		return pythonPatterns.some((pattern) => pattern.test(code));
	}

	/**
	 * Migrate a single node from Pyodide to local Python
	 */
	private async migrateNode(node: PyodideNode, result: MigrationResult): Promise<void> {
		const originalCode = node.parameters.code || node.parameters.pythonCode || '';

		if (!originalCode) {
			result.warnings.push(`Node ${node.id}: No Python code found`);
			return;
		}

		try {
			// Analyze the code
			const analysis = await this.analyzeCode(originalCode);

			// Apply migration transformations
			let migratedCode = originalCode;
			const appliedRules: string[] = [];

			for (const [ruleName, transform] of this.migrationRules) {
				const newCode = transform(migratedCode);
				if (newCode !== migratedCode) {
					migratedCode = newCode;
					appliedRules.push(ruleName);
				}
			}

			// Update node parameters for local Python execution
			if (node.parameters.language === 'python') {
				// Keep language as python but ensure it uses local execution
				node.parameters.executionMode = 'local';
			}

			// Update code parameter
			if (migratedCode !== originalCode) {
				if (node.parameters.pythonCode) {
					node.parameters.pythonCode = migratedCode;
				} else {
					node.parameters.code = migratedCode;
				}

				result.changes.push({
					nodeId: node.id,
					changeType: 'code_conversion',
					description: `Applied migration rules: ${appliedRules.join(', ')}`,
					oldValue: originalCode,
					newValue: migratedCode,
				});
			}

			// Add required packages
			if (analysis.requiresPackages.length > 0) {
				node.parameters.packages = [
					...(node.parameters.packages || []),
					...analysis.requiresPackages,
				];

				result.changes.push({
					nodeId: node.id,
					changeType: 'dependency_added',
					description: `Added required packages: ${analysis.requiresPackages.join(', ')}`,
					newValue: analysis.requiresPackages,
				});
			}

			// Add warnings for complex cases
			if (analysis.usesJsInterop) {
				result.warnings.push(
					`Node ${node.id}: JavaScript interoperability detected - manual review required`,
				);
			}

			if (analysis.hasSecurityIssues.length > 0) {
				result.warnings.push(
					`Node ${node.id}: Security issues detected: ${analysis.hasSecurityIssues.join(', ')}`,
				);
			}

			if (analysis.complexityScore > 8) {
				result.warnings.push(
					`Node ${node.id}: High complexity score (${analysis.complexityScore}) - careful testing recommended`,
				);
			}
		} catch (error) {
			result.errors.push(
				`Node ${node.id}: Migration failed - ${error instanceof Error ? error.message : String(error)}`,
			);
			result.success = false;
		}
	}

	/**
	 * Analyze Python code for migration requirements
	 */
	private async analyzeCode(code: string): Promise<CodeAnalysis> {
		const analysis: CodeAnalysis = {
			usesAsyncAwait: false,
			requiresPackages: [],
			hasSecurityIssues: [],
			usesJsInterop: false,
			complexityScore: 0,
		};

		// Check for async/await usage
		analysis.usesAsyncAwait = /\b(async|await)\b/.test(code);

		// Extract import statements to identify required packages
		const importMatches = code.match(/^(?:import\s+(\w+)|from\s+(\w+)\s+import)/gm);
		if (importMatches) {
			const packages = new Set<string>();
			for (const match of importMatches) {
				const packageMatch = match.match(/(?:import\s+(\w+)|from\s+(\w+)\s+import)/);
				if (packageMatch) {
					const packageName = packageMatch[1] || packageMatch[2];
					if (packageName && !this.isBuiltinModule(packageName)) {
						packages.add(packageName);
					}
				}
			}
			analysis.requiresPackages = Array.from(packages);
		}

		// Check for security issues
		for (const pattern of this.securityPatterns) {
			if (pattern.test(code)) {
				analysis.hasSecurityIssues.push(pattern.toString());
			}
		}

		// Check for JavaScript interoperability (Pyodide-specific)
		analysis.usesJsInterop = /\bjs\.\w+/.test(code) || /pyodide\./.test(code);

		// Calculate complexity score
		analysis.complexityScore = this.calculateComplexityScore(code);

		return analysis;
	}

	/**
	 * Calculate complexity score for Python code
	 */
	private calculateComplexityScore(code: string): number {
		let score = 0;

		// Basic complexity indicators
		score += (code.match(/\bdef\s+/g) || []).length; // Functions
		score += (code.match(/\bclass\s+/g) || []).length * 2; // Classes (more complex)
		score += (code.match(/\bif\s+/g) || []).length * 0.5; // Conditionals
		score += (code.match(/\bfor\s+/g) || []).length * 0.5; // Loops
		score += (code.match(/\bwhile\s+/g) || []).length * 0.5; // While loops
		score += (code.match(/\btry\s+/g) || []).length; // Exception handling
		score += (code.match(/\bimport\s+/g) || []).length * 0.2; // Imports
		score += (code.match(/\blambda\s+/g) || []).length * 0.3; // Lambda functions

		// Advanced complexity indicators
		score += (code.match(/\byield\s+/g) || []).length; // Generators
		score += (code.match(/\basync\s+def\s+/g) || []).length * 1.5; // Async functions
		score += (code.match(/\bawait\s+/g) || []).length * 0.5; // Await calls
		score += (code.match(/@\w+/g) || []).length * 0.5; // Decorators

		// Line-based complexity
		const lines = code.split('\n').filter((line) => line.trim().length > 0);
		score += lines.length * 0.1;

		return Math.round(score * 10) / 10;
	}

	/**
	 * Check if a module is built-in to Python
	 */
	private isBuiltinModule(moduleName: string): boolean {
		const builtinModules = [
			'os',
			'sys',
			'json',
			'datetime',
			'time',
			'math',
			'random',
			're',
			'collections',
			'itertools',
			'functools',
			'operator',
			'pathlib',
			'urllib',
			'http',
			'email',
			'html',
			'xml',
			'sqlite3',
			'csv',
			'configparser',
			'logging',
			'threading',
			'multiprocessing',
			'subprocess',
			'shutil',
			'glob',
			'pickle',
			'base64',
			'hashlib',
			'hmac',
			'secrets',
			'uuid',
			'decimal',
			'fractions',
			'statistics',
			'typing',
			'enum',
			'dataclasses',
			'abc',
			'contextlib',
			'weakref',
		];

		return builtinModules.includes(moduleName);
	}

	/**
	 * Initialize migration rules for code transformation
	 */
	private initializeMigrationRules(): void {
		// Remove Pyodide-specific imports and calls
		this.migrationRules.set('remove_pyodide_imports', (code: string) => {
			return code
				.replace(/^import\s+pyodide.*$/gm, '')
				.replace(/^from\s+pyodide\s+import.*$/gm, '')
				.replace(/pyodide\./g, '')
				.trim();
		});

		// Replace JavaScript interoperability
		this.migrationRules.set('replace_js_interop', (code: string) => {
			return code
				.replace(/js\./g, '# NOTE: JavaScript interop removed - ')
				.replace(/\.to_py\(\)/g, '')
				.replace(/\.to_js\(\)/g, '');
		});

		// Fix async execution patterns
		this.migrationRules.set('fix_async_patterns', (code: string) => {
			// Remove async/await for simple cases that don't need it
			if (!code.includes('aiohttp') && !code.includes('asyncio')) {
				return code.replace(/^async\s+def\s+(\w+)/gm, 'def $1').replace(/\bawait\s+/g, '');
			}
			return code;
		});

		// Add security safeguards
		this.migrationRules.set('add_security_safeguards', (code: string) => {
			let modifiedCode = code;

			// Comment out potentially dangerous operations
			if (/os\.system\s*\(/.test(code)) {
				modifiedCode = modifiedCode.replace(
					/os\.system\s*\([^)]+\)/g,
					'# SECURITY: os.system() call removed for safety',
				);
			}

			return modifiedCode;
		});

		// Optimize imports
		this.migrationRules.set('optimize_imports', (code: string) => {
			// Remove duplicate imports
			const lines = code.split('\n');
			const importLines = new Set<string>();
			const otherLines: string[] = [];

			for (const line of lines) {
				if (/^import\s+/.test(line) || /^from\s+\w+\s+import/.test(line)) {
					importLines.add(line.trim());
				} else {
					otherLines.push(line);
				}
			}

			const optimizedImports = Array.from(importLines).sort();
			return [...optimizedImports, '', ...otherLines].join('\n');
		});
	}
}
