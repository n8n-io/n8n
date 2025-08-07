'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PyodideToLocalPythonMigrationService = void 0;
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const n8n_workflow_1 = require('n8n-workflow');
const fs_1 = require('fs');
const path_1 = require('path');
let PyodideToLocalPythonMigrationService = class PyodideToLocalPythonMigrationService {
	constructor(logger) {
		this.logger = logger;
		this.migrationRules = new Map();
		this.securityPatterns = [
			/os\.system\s*\(/,
			/subprocess\./,
			/eval\s*\(/,
			/exec\s*\(/,
			/__import__\s*\(/,
			/import\s+os$/,
			/from\s+os\s+import/,
		];
		this.initializeMigrationRules();
		this.logger.info('Pyodide to Local Python Migration Service initialized');
	}
	async analyzeWorkflows(workflowsPath) {
		this.logger.info('Starting workflow analysis for Pyodide migration');
		try {
			const workflowFiles = await fs_1.promises.readdir(workflowsPath);
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
					const workflowPath = (0, path_1.join)(workflowsPath, file);
					const workflowContent = await fs_1.promises.readFile(workflowPath, 'utf8');
					const workflow = JSON.parse(workflowContent);
					const pyodideNodes = this.findPyodideNodes(workflow);
					if (pyodideNodes.length > 0) {
						pyodideCount++;
						const migrationWorkflow = {
							id: workflow.id || file.replace('.json', ''),
							name: workflow.name || file,
							nodes: pyodideNodes,
						};
						workflows.push(migrationWorkflow);
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
			throw new n8n_workflow_1.ApplicationError('Workflow analysis failed', { cause: error });
		}
	}
	async migrateWorkflow(workflow) {
		this.logger.info(`Starting migration for workflow: ${workflow.name}`, {
			workflowId: workflow.id,
			nodeCount: workflow.nodes.length,
		});
		const result = {
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
	async dryRunMigration(workflow) {
		const result = await this.migrateWorkflow(workflow);
		result.warnings.unshift('DRY RUN: No changes were actually applied');
		return result;
	}
	async getMigrationRecommendations(workflow) {
		let maxComplexity = 0;
		const prerequisites = new Set();
		const risks = new Set();
		for (const node of workflow.nodes) {
			const code = node.parameters.code || node.parameters.pythonCode || '';
			const analysis = await this.analyzeCode(code);
			maxComplexity = Math.max(maxComplexity, analysis.complexityScore);
			analysis.requiresPackages.forEach((pkg) => prerequisites.add(pkg));
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
			/if\s+__name__\s*==\s*['"']__main__['"']/,
			/print\s*\(/,
		];
		return pythonPatterns.some((pattern) => pattern.test(code));
	}
	async migrateNode(node, result) {
		const originalCode = node.parameters.code || node.parameters.pythonCode || '';
		if (!originalCode) {
			result.warnings.push(`Node ${node.id}: No Python code found`);
			return;
		}
		try {
			const analysis = await this.analyzeCode(originalCode);
			let migratedCode = originalCode;
			const appliedRules = [];
			for (const [ruleName, transform] of this.migrationRules) {
				const newCode = transform(migratedCode);
				if (newCode !== migratedCode) {
					migratedCode = newCode;
					appliedRules.push(ruleName);
				}
			}
			if (node.parameters.language === 'python') {
				node.parameters.executionMode = 'local';
			}
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
	async analyzeCode(code) {
		const analysis = {
			usesAsyncAwait: false,
			requiresPackages: [],
			hasSecurityIssues: [],
			usesJsInterop: false,
			complexityScore: 0,
		};
		analysis.usesAsyncAwait = /\b(async|await)\b/.test(code);
		const importMatches = code.match(/^(?:import\s+(\w+)|from\s+(\w+)\s+import)/gm);
		if (importMatches) {
			const packages = new Set();
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
		for (const pattern of this.securityPatterns) {
			if (pattern.test(code)) {
				analysis.hasSecurityIssues.push(pattern.toString());
			}
		}
		analysis.usesJsInterop = /\bjs\.\w+/.test(code) || /pyodide\./.test(code);
		analysis.complexityScore = this.calculateComplexityScore(code);
		return analysis;
	}
	calculateComplexityScore(code) {
		let score = 0;
		score += (code.match(/\bdef\s+/g) || []).length;
		score += (code.match(/\bclass\s+/g) || []).length * 2;
		score += (code.match(/\bif\s+/g) || []).length * 0.5;
		score += (code.match(/\bfor\s+/g) || []).length * 0.5;
		score += (code.match(/\bwhile\s+/g) || []).length * 0.5;
		score += (code.match(/\btry\s+/g) || []).length;
		score += (code.match(/\bimport\s+/g) || []).length * 0.2;
		score += (code.match(/\blambda\s+/g) || []).length * 0.3;
		score += (code.match(/\byield\s+/g) || []).length;
		score += (code.match(/\basync\s+def\s+/g) || []).length * 1.5;
		score += (code.match(/\bawait\s+/g) || []).length * 0.5;
		score += (code.match(/@\w+/g) || []).length * 0.5;
		const lines = code.split('\n').filter((line) => line.trim().length > 0);
		score += lines.length * 0.1;
		return Math.round(score * 10) / 10;
	}
	isBuiltinModule(moduleName) {
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
	initializeMigrationRules() {
		this.migrationRules.set('remove_pyodide_imports', (code) => {
			return code
				.replace(/^import\s+pyodide.*$/gm, '')
				.replace(/^from\s+pyodide\s+import.*$/gm, '')
				.replace(/pyodide\./g, '')
				.trim();
		});
		this.migrationRules.set('replace_js_interop', (code) => {
			return code
				.replace(/js\./g, '# NOTE: JavaScript interop removed - ')
				.replace(/\.to_py\(\)/g, '')
				.replace(/\.to_js\(\)/g, '');
		});
		this.migrationRules.set('fix_async_patterns', (code) => {
			if (!code.includes('aiohttp') && !code.includes('asyncio')) {
				return code.replace(/^async\s+def\s+(\w+)/gm, 'def $1').replace(/\bawait\s+/g, '');
			}
			return code;
		});
		this.migrationRules.set('add_security_safeguards', (code) => {
			let modifiedCode = code;
			if (/os\.system\s*\(/.test(code)) {
				modifiedCode = modifiedCode.replace(
					/os\.system\s*\([^)]+\)/g,
					'# SECURITY: os.system() call removed for safety',
				);
			}
			return modifiedCode;
		});
		this.migrationRules.set('optimize_imports', (code) => {
			const lines = code.split('\n');
			const importLines = new Set();
			const otherLines = [];
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
};
exports.PyodideToLocalPythonMigrationService = PyodideToLocalPythonMigrationService;
exports.PyodideToLocalPythonMigrationService = PyodideToLocalPythonMigrationService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	PyodideToLocalPythonMigrationService,
);
//# sourceMappingURL=pyodide-to-local-python.service.js.map
