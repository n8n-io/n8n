import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ApplicationError } from 'n8n-workflow';
import { PythonExecutorService } from '../services/python-executor.service';
import { PythonPoolService } from '../services/python-pool.service';
import { PythonCacheService } from '../services/python-cache.service';

interface PyodideCompatibilityOptions {
	enableLegacyMode: boolean;
	strictCompatibility: boolean;
	performanceOptimizations: boolean;
	securityChecks: boolean;
}

interface PyodideExecutionContext {
	[key: string]: any;
}

interface PyodideExecutionResult {
	result: any;
	stdout: string;
	stderr: string;
	executionTime: number;
	compatibility: {
		mode: 'pyodide-emulated' | 'local-python' | 'hybrid';
		warnings: string[];
		optimizations: string[];
	};
}

interface LegacyCodePattern {
	pattern: RegExp;
	replacement: string | ((match: string, ...groups: string[]) => string);
	description: string;
	riskLevel: 'low' | 'medium' | 'high';
}

@Service()
export class PyodideCompatibilityService {
	private readonly compatibilityOptions: PyodideCompatibilityOptions;
	private readonly legacyPatterns: LegacyCodePattern[] = [];
	private readonly jsInteropShims = new Map<string, string>();

	constructor(
		private readonly logger: Logger,
		private readonly pythonExecutor: PythonExecutorService,
		private readonly pythonPool: PythonPoolService,
		private readonly pythonCache: PythonCacheService,
	) {
		this.compatibilityOptions = {
			enableLegacyMode: process.env.N8N_PYTHON_LEGACY_MODE === 'true',
			strictCompatibility: process.env.N8N_PYTHON_STRICT_COMPAT === 'true',
			performanceOptimizations: process.env.N8N_PYTHON_PERFORMANCE_OPT !== 'false',
			securityChecks: process.env.N8N_PYTHON_SECURITY_CHECKS !== 'false',
		};

		this.initializeLegacyPatterns();
		this.initializeJsInteropShims();

		this.logger.info('Pyodide Compatibility Service initialized', {
			options: this.compatibilityOptions,
		});
	}

	/**
	 * Execute Python code with Pyodide compatibility layer
	 */
	async executeWithCompatibility(
		code: string,
		context: PyodideExecutionContext,
		options: {
			timeout?: number;
			packages?: string[];
			compatibilityMode?: 'auto' | 'legacy' | 'modern';
			allowJsInterop?: boolean;
		} = {},
	): Promise<PyodideExecutionResult> {
		const startTime = Date.now();

		this.logger.debug('Starting Pyodide-compatible execution', {
			codeLength: code.length,
			contextKeys: Object.keys(context),
			compatibilityMode: options.compatibilityMode,
		});

		const result: PyodideExecutionResult = {
			result: null,
			stdout: '',
			stderr: '',
			executionTime: 0,
			compatibility: {
				mode: 'local-python',
				warnings: [],
				optimizations: [],
			},
		};

		try {
			// Analyze code for compatibility requirements
			const analysis = await this.analyzeCodeCompatibility(code);

			// Determine execution mode
			const executionMode = this.determineExecutionMode(code, options.compatibilityMode);
			result.compatibility.mode = executionMode;

			// Apply compatibility transformations
			let compatibleCode = code;
			if (analysis.requiresTransformation) {
				compatibleCode = await this.transformCode(code, result.compatibility);
			}

			// Prepare execution context with Pyodide compatibility
			const compatibleContext = await this.prepareCompatibleContext(context, result.compatibility);

			// Execute using appropriate method
			let executionResult;
			if (executionMode === 'local-python' && this.compatibilityOptions.performanceOptimizations) {
				// Use optimized execution with pooling
				executionResult = await this.pythonPool.executeCode({
					code: compatibleCode,
					context: compatibleContext,
					timeout: options.timeout,
					packages: options.packages,
					priority: 'normal',
				});
			} else {
				// Use standard execution
				executionResult = await this.pythonExecutor.executeCode({
					code: compatibleCode,
					context: compatibleContext,
					timeout: options.timeout,
					packages: options.packages,
				});
			}

			// Post-process results for Pyodide compatibility
			result.result = await this.postProcessResult(executionResult.result, result.compatibility);
			result.stdout = executionResult.stdout;
			result.stderr = executionResult.stderr;
			result.executionTime = Date.now() - startTime;

			this.logger.debug('Pyodide-compatible execution completed', {
				executionTime: result.executionTime,
				mode: result.compatibility.mode,
				warningsCount: result.compatibility.warnings.length,
			});

			return result;
		} catch (error) {
			result.executionTime = Date.now() - startTime;
			result.compatibility.warnings.push(
				`Execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);

			this.logger.error('Pyodide-compatible execution failed', {
				error,
				executionTime: result.executionTime,
			});

			throw new ApplicationError('Python execution failed in compatibility mode', {
				cause: error,
				extra: {
					compatibilityMode: result.compatibility.mode,
					warnings: result.compatibility.warnings,
				},
			});
		}
	}

	/**
	 * Check if code requires Pyodide compatibility transformations
	 */
	async checkCompatibility(code: string): Promise<{
		isCompatible: boolean;
		issues: Array<{
			type: 'js_interop' | 'async_pattern' | 'security_issue' | 'package_conflict';
			description: string;
			severity: 'low' | 'medium' | 'high';
			autoFixable: boolean;
		}>;
		recommendations: string[];
	}> {
		const issues: Array<{
			type: 'js_interop' | 'async_pattern' | 'security_issue' | 'package_conflict';
			description: string;
			severity: 'low' | 'medium' | 'high';
			autoFixable: boolean;
		}> = [];
		const recommendations: string[] = [];

		// Check for JavaScript interoperability
		if (/\bjs\.\w+/.test(code)) {
			issues.push({
				type: 'js_interop',
				description: 'JavaScript interoperability detected (js.* calls)',
				severity: 'high',
				autoFixable: false,
			});
			recommendations.push('Replace JavaScript interop with Python-native alternatives');
		}

		// Check for Pyodide-specific patterns
		if (/pyodide\./.test(code)) {
			issues.push({
				type: 'js_interop',
				description: 'Pyodide-specific API calls detected',
				severity: 'medium',
				autoFixable: true,
			});
			recommendations.push('Remove Pyodide-specific calls - they will be emulated');
		}

		// Check for async patterns that may need adjustment
		if (/async\s+def|await\s+/.test(code) && !/asyncio|aiohttp/.test(code)) {
			issues.push({
				type: 'async_pattern',
				description: 'Async/await patterns detected without async libraries',
				severity: 'medium',
				autoFixable: true,
			});
			recommendations.push('Consider removing async/await for synchronous operations');
		}

		// Check for security issues
		if (/os\.system|subprocess|eval|exec/.test(code)) {
			issues.push({
				type: 'security_issue',
				description: 'Potentially unsafe operations detected',
				severity: 'high',
				autoFixable: false,
			});
			recommendations.push('Review and secure potentially dangerous operations');
		}

		const isCompatible =
			issues.filter((issue) => issue.severity === 'high' && !issue.autoFixable).length === 0;

		if (isCompatible) {
			recommendations.push('Code is compatible with local Python execution');
		}

		return {
			isCompatible,
			issues,
			recommendations,
		};
	}

	/**
	 * Generate compatibility report for a collection of Python code
	 */
	async generateCompatibilityReport(codeSnippets: Array<{ id: string; code: string }>): Promise<{
		overallCompatibility: number; // 0-100 percentage
		summary: {
			total: number;
			compatible: number;
			requiresChanges: number;
			incompatible: number;
		};
		details: Array<{
			id: string;
			compatibility: Awaited<ReturnType<typeof this.checkCompatibility>>;
		}>;
		globalRecommendations: string[];
	}> {
		const details = [];
		let compatible = 0;
		let requiresChanges = 0;
		let incompatible = 0;
		const globalIssues = new Set<string>();

		for (const snippet of codeSnippets) {
			const compatibility = await this.checkCompatibility(snippet.code);
			details.push({
				id: snippet.id,
				compatibility,
			});

			if (compatibility.isCompatible) {
				if (compatibility.issues.length === 0) {
					compatible++;
				} else {
					requiresChanges++;
				}
			} else {
				incompatible++;
			}

			// Collect global issues
			compatibility.issues.forEach((issue) => globalIssues.add(issue.type));
		}

		const total = codeSnippets.length;
		const overallCompatibility =
			total > 0 ? Math.round(((compatible + requiresChanges * 0.5) / total) * 100) : 100;

		const globalRecommendations = [];
		if (globalIssues.has('js_interop')) {
			globalRecommendations.push(
				'Consider migrating JavaScript interoperability to Python-native solutions',
			);
		}
		if (globalIssues.has('security_issue')) {
			globalRecommendations.push('Review all security-sensitive operations before migration');
		}
		if (globalIssues.has('async_pattern')) {
			globalRecommendations.push(
				'Evaluate async patterns and migrate to appropriate Python async libraries if needed',
			);
		}

		return {
			overallCompatibility,
			summary: {
				total,
				compatible,
				requiresChanges,
				incompatible,
			},
			details,
			globalRecommendations,
		};
	}

	/**
	 * Apply automatic fixes to make code more compatible
	 */
	async applyCompatibilityFixes(code: string): Promise<{
		fixedCode: string;
		appliedFixes: Array<{
			description: string;
			pattern: string;
			riskLevel: 'low' | 'medium' | 'high';
		}>;
		manualReviewRequired: boolean;
	}> {
		let fixedCode = code;
		const appliedFixes: Array<{
			description: string;
			pattern: string;
			riskLevel: 'low' | 'medium' | 'high';
		}> = [];
		let manualReviewRequired = false;

		for (const legacyPattern of this.legacyPatterns) {
			if (legacyPattern.pattern.test(fixedCode)) {
				const oldCode = fixedCode;
				if (typeof legacyPattern.replacement === 'string') {
					fixedCode = fixedCode.replace(legacyPattern.pattern, legacyPattern.replacement);
				} else {
					fixedCode = fixedCode.replace(legacyPattern.pattern, legacyPattern.replacement);
				}

				if (fixedCode !== oldCode) {
					appliedFixes.push({
						description: legacyPattern.description,
						pattern: legacyPattern.pattern.toString(),
						riskLevel: legacyPattern.riskLevel,
					});

					if (legacyPattern.riskLevel === 'high') {
						manualReviewRequired = true;
					}
				}
			}
		}

		return {
			fixedCode,
			appliedFixes,
			manualReviewRequired,
		};
	}

	/**
	 * Analyze code for compatibility requirements
	 */
	private async analyzeCodeCompatibility(code: string): Promise<{
		requiresTransformation: boolean;
		hasJsInterop: boolean;
		hasAsyncPatterns: boolean;
		hasSecurityIssues: boolean;
		estimatedComplexity: number;
	}> {
		const hasJsInterop = /\bjs\.\w+/.test(code) || /pyodide\./.test(code);
		const hasAsyncPatterns = /async\s+def|await\s+/.test(code);
		const hasSecurityIssues = /os\.system|subprocess|eval|exec/.test(code);

		// Simple complexity estimation
		const complexity =
			(code.match(/def\s+/g) || []).length +
			(code.match(/class\s+/g) || []).length * 2 +
			(code.match(/if\s+/g) || []).length * 0.5 +
			(code.match(/for\s+|while\s+/g) || []).length * 0.5;

		const requiresTransformation = hasJsInterop || (hasAsyncPatterns && !code.includes('asyncio'));

		return {
			requiresTransformation,
			hasJsInterop,
			hasAsyncPatterns,
			hasSecurityIssues,
			estimatedComplexity: complexity,
		};
	}

	/**
	 * Determine the best execution mode for the code
	 */
	private determineExecutionMode(
		code: string,
		requestedMode?: 'auto' | 'legacy' | 'modern',
	): 'pyodide-emulated' | 'local-python' | 'hybrid' {
		if (requestedMode === 'legacy') {
			return 'pyodide-emulated';
		}

		if (requestedMode === 'modern') {
			return 'local-python';
		}

		// Auto-detection logic
		const hasJsInterop = /\bjs\.\w+/.test(code);
		const hasPyodideSpecific = /pyodide\./.test(code);

		if (hasJsInterop && !this.compatibilityOptions.enableLegacyMode) {
			return 'hybrid'; // Use shims for JS interop
		}

		if (hasPyodideSpecific && this.compatibilityOptions.enableLegacyMode) {
			return 'pyodide-emulated';
		}

		return 'local-python';
	}

	/**
	 * Transform code for compatibility
	 */
	private async transformCode(
		code: string,
		compatibility: PyodideExecutionResult['compatibility'],
	): Promise<string> {
		let transformedCode = code;

		// Apply legacy pattern transformations
		for (const pattern of this.legacyPatterns) {
			if (pattern.pattern.test(transformedCode)) {
				const oldCode = transformedCode;
				if (typeof pattern.replacement === 'string') {
					transformedCode = transformedCode.replace(pattern.pattern, pattern.replacement);
				} else {
					transformedCode = transformedCode.replace(pattern.pattern, pattern.replacement);
				}

				if (transformedCode !== oldCode) {
					compatibility.optimizations.push(pattern.description);
				}
			}
		}

		// Add shims for JavaScript interoperability
		if (/\bjs\.\w+/.test(transformedCode)) {
			const shimCode = this.generateJsInteropShims(transformedCode);
			transformedCode = shimCode + '\n\n' + transformedCode;
			compatibility.warnings.push('JavaScript interoperability emulated with shims');
		}

		return transformedCode;
	}

	/**
	 * Prepare execution context with Pyodide compatibility
	 */
	private async prepareCompatibleContext(
		context: PyodideExecutionContext,
		compatibility: PyodideExecutionResult['compatibility'],
	): Promise<Record<string, any>> {
		const compatibleContext = { ...context };

		// Add Pyodide compatibility objects if needed
		if (compatibility.mode === 'pyodide-emulated' || compatibility.mode === 'hybrid') {
			compatibleContext.__pyodide_compat__ = {
				js: this.createJsShim(),
				pyodide: this.createPyodideShim(),
			};
		}

		// Convert variable names for Python compatibility ($ prefix -> _)
		const pythonContext: Record<string, any> = {};
		for (const [key, value] of Object.entries(compatibleContext)) {
			const pythonKey = key.startsWith('$') ? key.replace(/^\$/, '_') : key;
			pythonContext[pythonKey] = value;
		}

		return pythonContext;
	}

	/**
	 * Post-process execution results for Pyodide compatibility
	 */
	private async postProcessResult(
		result: any,
		compatibility: PyodideExecutionResult['compatibility'],
	): Promise<any> {
		// If result is a Python object that needs JavaScript-style conversion
		if (result && typeof result === 'object') {
			// Convert Python-style results to match Pyodide expectations
			return this.convertPythonResult(result);
		}

		return result;
	}

	/**
	 * Convert Python results to match Pyodide-style output
	 */
	private convertPythonResult(result: any): any {
		// Handle common Python -> JavaScript conversions
		if (result instanceof Map) {
			return Object.fromEntries(result);
		}

		if (Array.isArray(result)) {
			return result.map((item) => this.convertPythonResult(item));
		}

		if (result && typeof result === 'object') {
			const converted: any = {};
			for (const [key, value] of Object.entries(result)) {
				converted[key] = this.convertPythonResult(value);
			}
			return converted;
		}

		return result;
	}

	/**
	 * Generate JavaScript interoperability shims
	 */
	private generateJsInteropShims(code: string): string {
		const usedShims = [];

		for (const [pattern, shim] of this.jsInteropShims) {
			if (new RegExp(pattern).test(code)) {
				usedShims.push(shim);
			}
		}

		if (usedShims.length === 0) {
			return '';
		}

		return `# Pyodide Compatibility Shims
${usedShims.join('\n\n')}

# End of Compatibility Shims`;
	}

	/**
	 * Create JavaScript interoperability shim
	 */
	private createJsShim(): Record<string, any> {
		return {
			console: {
				log: (...args: any[]) => console.log(...args),
				warn: (...args: any[]) => console.warn(...args),
				error: (...args: any[]) => console.error(...args),
			},
			Object: {
				keys: (obj: any) => Object.keys(obj),
				values: (obj: any) => Object.values(obj),
				entries: (obj: any) => Object.entries(obj),
			},
		};
	}

	/**
	 * Create Pyodide API shim
	 */
	private createPyodideShim(): Record<string, any> {
		return {
			globals: {
				get: (name: string) => global[name as keyof typeof global],
				set: (name: string, value: any) => {
					(global as any)[name] = value;
				},
			},
			runPython: (code: string) => {
				// This would need to be implemented to actually execute Python
				throw new Error('pyodide.runPython() is not supported in local execution mode');
			},
		};
	}

	/**
	 * Initialize legacy code patterns for transformation
	 */
	private initializeLegacyPatterns(): void {
		this.legacyPatterns.push(
			{
				pattern: /import\s+pyodide/g,
				replacement: '# pyodide import removed for local execution',
				description: 'Removed Pyodide import',
				riskLevel: 'low',
			},
			{
				pattern: /from\s+pyodide\s+import\s+\w+/g,
				replacement: '# pyodide import removed for local execution',
				description: 'Removed Pyodide import',
				riskLevel: 'low',
			},
			{
				pattern: /pyodide\.runPython\(/g,
				replacement: '# pyodide.runPython() not supported - ',
				description: 'Replaced pyodide.runPython() call',
				riskLevel: 'high',
			},
			{
				pattern: /\.to_py\(\)/g,
				replacement: '',
				description: 'Removed .to_py() conversion',
				riskLevel: 'low',
			},
			{
				pattern: /\.to_js\(\)/g,
				replacement: '',
				description: 'Removed .to_js() conversion',
				riskLevel: 'low',
			},
			{
				pattern: /js\.(\w+)/g,
				replacement: '__js_shim__.$1',
				description: 'Replaced js.* calls with shim',
				riskLevel: 'medium',
			},
		);
	}

	/**
	 * Initialize JavaScript interoperability shims
	 */
	private initializeJsInteropShims(): void {
		this.jsInteropShims.set(
			'js\\.console',
			`
class JSConsoleShim:
    @staticmethod
    def log(*args):
        print(*args)
    
    @staticmethod
    def warn(*args):
        print("WARNING:", *args)
    
    @staticmethod
    def error(*args):
        print("ERROR:", *args, file=sys.stderr)

class JSShim:
    console = JSConsoleShim()

__js_shim__ = JSShim()`,
		);

		this.jsInteropShims.set(
			'js\\.Object',
			`
class JSObjectShim:
    @staticmethod
    def keys(obj):
        if hasattr(obj, 'keys'):
            return list(obj.keys())
        return []
    
    @staticmethod
    def values(obj):
        if hasattr(obj, 'values'):
            return list(obj.values())
        return []
    
    @staticmethod
    def entries(obj):
        if hasattr(obj, 'items'):
            return list(obj.items())
        return []

if '__js_shim__' not in locals():
    class JSShim:
        pass
    __js_shim__ = JSShim()

__js_shim__.Object = JSObjectShim()`,
		);
	}
}
