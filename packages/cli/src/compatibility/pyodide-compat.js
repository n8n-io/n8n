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
exports.PyodideCompatibilityService = void 0;
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const n8n_workflow_1 = require('n8n-workflow');
const python_executor_service_1 = require('../services/python-executor.service');
const python_pool_service_1 = require('../services/python-pool.service');
const python_cache_service_1 = require('../services/python-cache.service');
let PyodideCompatibilityService = class PyodideCompatibilityService {
	constructor(logger, pythonExecutor, pythonPool, pythonCache) {
		this.logger = logger;
		this.pythonExecutor = pythonExecutor;
		this.pythonPool = pythonPool;
		this.pythonCache = pythonCache;
		this.legacyPatterns = [];
		this.jsInteropShims = new Map();
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
	async executeWithCompatibility(code, context, options = {}) {
		const startTime = Date.now();
		this.logger.debug('Starting Pyodide-compatible execution', {
			codeLength: code.length,
			contextKeys: Object.keys(context),
			compatibilityMode: options.compatibilityMode,
		});
		const result = {
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
			const analysis = await this.analyzeCodeCompatibility(code);
			const executionMode = this.determineExecutionMode(code, options.compatibilityMode);
			result.compatibility.mode = executionMode;
			let compatibleCode = code;
			if (analysis.requiresTransformation) {
				compatibleCode = await this.transformCode(code, result.compatibility);
			}
			const compatibleContext = await this.prepareCompatibleContext(context, result.compatibility);
			let executionResult;
			if (executionMode === 'local-python' && this.compatibilityOptions.performanceOptimizations) {
				executionResult = await this.pythonPool.executeCode({
					code: compatibleCode,
					context: compatibleContext,
					timeout: options.timeout,
					packages: options.packages,
					priority: 'normal',
				});
			} else {
				executionResult = await this.pythonExecutor.executeCode({
					code: compatibleCode,
					context: compatibleContext,
					timeout: options.timeout,
					packages: options.packages,
				});
			}
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
			throw new n8n_workflow_1.ApplicationError('Python execution failed in compatibility mode', {
				cause: error,
				extra: {
					compatibilityMode: result.compatibility.mode,
					warnings: result.compatibility.warnings,
				},
			});
		}
	}
	async checkCompatibility(code) {
		const issues = [];
		const recommendations = [];
		if (/\bjs\.\w+/.test(code)) {
			issues.push({
				type: 'js_interop',
				description: 'JavaScript interoperability detected (js.* calls)',
				severity: 'high',
				autoFixable: false,
			});
			recommendations.push('Replace JavaScript interop with Python-native alternatives');
		}
		if (/pyodide\./.test(code)) {
			issues.push({
				type: 'js_interop',
				description: 'Pyodide-specific API calls detected',
				severity: 'medium',
				autoFixable: true,
			});
			recommendations.push('Remove Pyodide-specific calls - they will be emulated');
		}
		if (/async\s+def|await\s+/.test(code) && !/asyncio|aiohttp/.test(code)) {
			issues.push({
				type: 'async_pattern',
				description: 'Async/await patterns detected without async libraries',
				severity: 'medium',
				autoFixable: true,
			});
			recommendations.push('Consider removing async/await for synchronous operations');
		}
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
	async generateCompatibilityReport(codeSnippets) {
		const details = [];
		let compatible = 0;
		let requiresChanges = 0;
		let incompatible = 0;
		const globalIssues = new Set();
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
	async applyCompatibilityFixes(code) {
		let fixedCode = code;
		const appliedFixes = [];
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
	async analyzeCodeCompatibility(code) {
		const hasJsInterop = /\bjs\.\w+/.test(code) || /pyodide\./.test(code);
		const hasAsyncPatterns = /async\s+def|await\s+/.test(code);
		const hasSecurityIssues = /os\.system|subprocess|eval|exec/.test(code);
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
	determineExecutionMode(code, requestedMode) {
		if (requestedMode === 'legacy') {
			return 'pyodide-emulated';
		}
		if (requestedMode === 'modern') {
			return 'local-python';
		}
		const hasJsInterop = /\bjs\.\w+/.test(code);
		const hasPyodideSpecific = /pyodide\./.test(code);
		if (hasJsInterop && !this.compatibilityOptions.enableLegacyMode) {
			return 'hybrid';
		}
		if (hasPyodideSpecific && this.compatibilityOptions.enableLegacyMode) {
			return 'pyodide-emulated';
		}
		return 'local-python';
	}
	async transformCode(code, compatibility) {
		let transformedCode = code;
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
		if (/\bjs\.\w+/.test(transformedCode)) {
			const shimCode = this.generateJsInteropShims(transformedCode);
			transformedCode = shimCode + '\n\n' + transformedCode;
			compatibility.warnings.push('JavaScript interoperability emulated with shims');
		}
		return transformedCode;
	}
	async prepareCompatibleContext(context, compatibility) {
		const compatibleContext = { ...context };
		if (compatibility.mode === 'pyodide-emulated' || compatibility.mode === 'hybrid') {
			compatibleContext.__pyodide_compat__ = {
				js: this.createJsShim(),
				pyodide: this.createPyodideShim(),
			};
		}
		const pythonContext = {};
		for (const [key, value] of Object.entries(compatibleContext)) {
			const pythonKey = key.startsWith('$') ? key.replace(/^\$/, '_') : key;
			pythonContext[pythonKey] = value;
		}
		return pythonContext;
	}
	async postProcessResult(result, compatibility) {
		if (result && typeof result === 'object') {
			return this.convertPythonResult(result);
		}
		return result;
	}
	convertPythonResult(result) {
		if (result instanceof Map) {
			return Object.fromEntries(result);
		}
		if (Array.isArray(result)) {
			return result.map((item) => this.convertPythonResult(item));
		}
		if (result && typeof result === 'object') {
			const converted = {};
			for (const [key, value] of Object.entries(result)) {
				converted[key] = this.convertPythonResult(value);
			}
			return converted;
		}
		return result;
	}
	generateJsInteropShims(code) {
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
	createJsShim() {
		return {
			console: {
				log: (...args) => console.log(...args),
				warn: (...args) => console.warn(...args),
				error: (...args) => console.error(...args),
			},
			Object: {
				keys: (obj) => Object.keys(obj),
				values: (obj) => Object.values(obj),
				entries: (obj) => Object.entries(obj),
			},
		};
	}
	createPyodideShim() {
		return {
			globals: {
				get: (name) => global[name],
				set: (name, value) => {
					global[name] = value;
				},
			},
			runPython: (code) => {
				throw new Error('pyodide.runPython() is not supported in local execution mode');
			},
		};
	}
	initializeLegacyPatterns() {
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
	initializeJsInteropShims() {
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
};
exports.PyodideCompatibilityService = PyodideCompatibilityService;
exports.PyodideCompatibilityService = PyodideCompatibilityService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			python_executor_service_1.PythonExecutorService,
			python_pool_service_1.PythonPoolService,
			python_cache_service_1.PythonCacheService,
		]),
	],
	PyodideCompatibilityService,
);
//# sourceMappingURL=pyodide-compat.js.map
