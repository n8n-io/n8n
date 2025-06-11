#!/usr/bin/env node

/**
 * Component Dependency Analysis Tool for n8n Frontend
 *
 * This script analyzes Vue component dependencies by tracing which components
 * are used in which pages/views. It creates a comprehensive dependency tree
 * showing the relationships between views and components.
 *
 * Usage: node analyze-component-dependencies.js [options]
 * Options:
 *   --format=json|tree|table  Output format (default: tree)
 *   --depth=N                 Maximum depth to analyze (default: 3)
 *   --output=file.json        Save results to file
 *   --verbose                 Show detailed analysis
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, 'packages/frontend/editor-ui/src');
const VIEWS_DIR = path.join(BASE_DIR, 'views');
const COMPONENTS_DIR = path.join(BASE_DIR, 'components');

class ComponentDependencyAnalyzer {
	constructor(options = {}) {
		this.options = {
			format: 'tree',
			depth: 5, // Increased default depth for deeper analysis
			output: null,
			verbose: false,
			includeExternal: true, // New option to include external deps
			...options,
		};

		this.viewDependencies = new Map();
		this.componentDependencies = new Map();
		this.reverseIndex = new Map(); // component -> views that use it
		this.externalDependencies = new Map(); // track external library usage
		this.designSystemDependencies = new Map(); // track n8n design system usage
		this.processedComponents = new Set(); // prevent infinite recursion
	}

	/**
	 * Extract import statements from a Vue file
	 */
	extractImports(filePath) {
		try {
			const content = fs.readFileSync(filePath, 'utf8');
			const imports = [];

			// Match import statements with various patterns
			const importPatterns = [
				// import Component from 'path'
				/import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
				// import { Component1, Component2 } from 'path'
				/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"`]([^'"`]+)['"`]/g,
				// const Component = defineAsyncComponent(() => import('path'))
				/const\s+(\w+)\s*=\s*defineAsyncComponent\([^)]*import\s*\(\s*['"`]([^'"`]+)['"`]/g,
			];

			importPatterns.forEach((pattern) => {
				let match;
				while ((match = pattern.exec(content)) !== null) {
					const importPath = match[2];
					const importType = this.categorizeImport(importPath);

					// Process all imports (local, external, design-system)
					if (importType !== 'ignored') {
						if (match[1].includes(',') || match[1].includes('{')) {
							// Handle destructured imports
							const components = match[1]
								.replace(/[{}]/g, '')
								.split(',')
								.map((c) => c.trim())
								.filter((c) => c);

							components.forEach((component) => {
								imports.push({
									name: component,
									path: this.normalizePath(importPath),
									type: importType,
									originalPath: importPath,
								});
							});
						} else {
							imports.push({
								name: match[1],
								path: this.normalizePath(importPath),
								type: importType,
								originalPath: importPath,
							});
						}
					}
				}
			});

			return imports;
		} catch (error) {
			if (this.options.verbose) {
				console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
			}
			return [];
		}
	}

	/**
	 * Categorize import types
	 */
	categorizeImport(importPath) {
		// Design system components
		if (importPath.startsWith('@n8n/design-system')) {
			return 'design-system';
		}

		// n8n packages (workflow, core, etc.)
		if (importPath.startsWith('n8n-') || importPath.startsWith('@n8n/')) {
			return 'n8n-package';
		}

		// Local components/views
		if (
			importPath.startsWith('./') ||
			importPath.startsWith('../') ||
			importPath.startsWith('@/') ||
			importPath.startsWith('~/')
		) {
			return 'local';
		}

		// External third-party libraries
		const externalLibs = [
			'vue',
			'vue-router',
			'pinia',
			'element-plus',
			'lodash',
			'axios',
			'moment',
			'dayjs',
			'chart.js',
			'codemirror',
			'vuelidate',
		];

		if (externalLibs.some((lib) => importPath.startsWith(lib))) {
			return 'external';
		}

		// If it doesn't include node_modules and isn't a known external lib, it's probably local
		if (!importPath.includes('node_modules')) {
			return 'local';
		}

		// Default to ignored for node_modules and unknown patterns
		return 'ignored';
	}

	/**
	 * Check if an import path is local (not from node_modules)
	 */
	isLocalImport(importPath) {
		return this.categorizeImport(importPath) === 'local';
	}

	/**
	 * Check if import is from an external library
	 */
	isExternalLibrary(importPath) {
		const type = this.categorizeImport(importPath);
		return type === 'external' || type === 'design-system' || type === 'n8n-package';
	}

	/**
	 * Normalize import paths
	 */
	normalizePath(importPath) {
		// Convert @/ to relative path
		if (importPath.startsWith('@/')) {
			return importPath.replace('@/', '');
		}

		// Resolve relative paths
		if (importPath.startsWith('./') || importPath.startsWith('../')) {
			return path.normalize(importPath);
		}

		return importPath;
	}

	/**
	 * Get all Vue files in a directory recursively
	 */
	getVueFiles(dir, prefix = '') {
		const files = [];

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

				if (entry.isDirectory()) {
					files.push(...this.getVueFiles(fullPath, relativePath));
				} else if (entry.name.endsWith('.vue')) {
					files.push({
						name: entry.name,
						path: relativePath,
						fullPath: fullPath,
					});
				}
			}
		} catch (error) {
			if (this.options.verbose) {
				console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
			}
		}

		return files;
	}

	/**
	 * Analyze all view dependencies
	 */
	analyzeViews() {
		const viewFiles = this.getVueFiles(VIEWS_DIR, 'views');

		for (const viewFile of viewFiles) {
			const imports = this.extractImports(viewFile.fullPath);
			
			// Categorize imports by type
			const localComponents = imports.filter((imp) => imp.type === 'local' && this.isComponentImport(imp.path));
			const externalComponents = imports.filter((imp) => imp.type === 'external');
			const designSystemComponents = imports.filter((imp) => imp.type === 'design-system');
			const n8nPackageComponents = imports.filter((imp) => imp.type === 'n8n-package');

			this.viewDependencies.set(viewFile.path, {
				name: viewFile.name,
				fullPath: viewFile.fullPath,
				imports: imports,
				localComponents,
				externalComponents,
				designSystemComponents,
				n8nPackageComponents,
				allComponents: [...localComponents, ...externalComponents, ...designSystemComponents, ...n8nPackageComponents],
			});

			// Build reverse index for local components
			localComponents.forEach((imp) => {
				if (!this.reverseIndex.has(imp.path)) {
					this.reverseIndex.set(imp.path, []);
				}
				this.reverseIndex.get(imp.path).push(viewFile.path);
			});

			// Track external dependencies
			[...externalComponents, ...designSystemComponents, ...n8nPackageComponents].forEach((imp) => {
				if (!this.externalDependencies.has(imp.originalPath)) {
					this.externalDependencies.set(imp.originalPath, {
						type: imp.type,
						components: new Set(),
						usedBy: new Set(),
					});
				}
				this.externalDependencies.get(imp.originalPath).components.add(imp.name);
				this.externalDependencies.get(imp.originalPath).usedBy.add(viewFile.path);
			});
		}
	}

	/**
	 * Analyze component dependencies recursively
	 */
	analyzeComponents(depth = 0) {
		if (depth >= this.options.depth) return;

		const componentFiles = this.getVueFiles(COMPONENTS_DIR, 'components');
		const componentsToProcess = [];

		for (const componentFile of componentFiles) {
			if (this.componentDependencies.has(componentFile.path)) continue;
			componentsToProcess.push(componentFile);
		}

		// Process components at current depth
		for (const componentFile of componentsToProcess) {
			if (this.processedComponents.has(componentFile.path)) continue;
			this.processedComponents.add(componentFile.path);

			const imports = this.extractImports(componentFile.fullPath);
			
			// Categorize imports by type
			const localComponents = imports.filter((imp) => imp.type === 'local' && this.isComponentImport(imp.path));
			const externalComponents = imports.filter((imp) => imp.type === 'external');
			const designSystemComponents = imports.filter((imp) => imp.type === 'design-system');
			const n8nPackageComponents = imports.filter((imp) => imp.type === 'n8n-package');

			this.componentDependencies.set(componentFile.path, {
				name: componentFile.name,
				fullPath: componentFile.fullPath,
				imports: imports,
				localComponents,
				externalComponents,
				designSystemComponents,
				n8nPackageComponents,
				allComponents: [...localComponents, ...externalComponents, ...designSystemComponents, ...n8nPackageComponents],
				usedBy: this.reverseIndex.get(componentFile.path) || [],
				depth: depth,
			});

			// Update reverse index for newly found local components
			localComponents.forEach((imp) => {
				if (!this.reverseIndex.has(imp.path)) {
					this.reverseIndex.set(imp.path, []);
				}
				if (!this.reverseIndex.get(imp.path).includes(componentFile.path)) {
					this.reverseIndex.get(imp.path).push(componentFile.path);
				}
			});

			// Track external dependencies from components
			[...externalComponents, ...designSystemComponents, ...n8nPackageComponents].forEach((imp) => {
				if (!this.externalDependencies.has(imp.originalPath)) {
					this.externalDependencies.set(imp.originalPath, {
						type: imp.type,
						components: new Set(),
						usedBy: new Set(),
					});
				}
				this.externalDependencies.get(imp.originalPath).components.add(imp.name);
				this.externalDependencies.get(imp.originalPath).usedBy.add(componentFile.path);
			});
		}

		// Recursively analyze deeper components
		if (depth < this.options.depth - 1) {
			this.analyzeComponents(depth + 1);
		}
	}

	/**
	 * Check if import path points to a component
	 */
	isComponentImport(importPath) {
		return (
			importPath.includes('components/') ||
			importPath.includes('views/') ||
			importPath.endsWith('.vue')
		);
	}

	/**
	 * Generate dependency tree
	 */
	generateDependencyTree() {
		const tree = {
			views: {},
			components: {},
			externalLibraries: {},
			summary: {
				totalViews: this.viewDependencies.size,
				totalComponents: this.componentDependencies.size,
				totalExternalLibraries: this.externalDependencies.size,
				totalLocalDependencies: 0,
				totalExternalDependencies: 0,
			},
		};

		// Process views
		for (const [viewPath, viewData] of this.viewDependencies) {
			tree.views[viewPath] = {
				name: viewData.name,
				localComponents: viewData.localComponents.map((comp) => ({
					name: comp.name,
					path: comp.path,
					type: comp.type,
				})),
				externalComponents: viewData.externalComponents.map((comp) => ({
					name: comp.name,
					path: comp.originalPath,
					type: comp.type,
				})),
				designSystemComponents: viewData.designSystemComponents.map((comp) => ({
					name: comp.name,
					path: comp.originalPath,
					type: comp.type,
				})),
				n8nPackageComponents: viewData.n8nPackageComponents.map((comp) => ({
					name: comp.name,
					path: comp.originalPath,
					type: comp.type,
				})),
				totalLocalComponents: viewData.localComponents.length,
				totalExternalComponents: viewData.externalComponents.length + viewData.designSystemComponents.length + viewData.n8nPackageComponents.length,
				totalComponents: viewData.allComponents.length,
			};
			tree.summary.totalLocalDependencies += viewData.localComponents.length;
			tree.summary.totalExternalDependencies += viewData.externalComponents.length + viewData.designSystemComponents.length + viewData.n8nPackageComponents.length;
		}

		// Process components
		for (const [compPath, compData] of this.componentDependencies) {
			tree.components[compPath] = {
				name: compData.name,
				depth: compData.depth || 0,
				localDependencies: compData.localComponents.map((comp) => ({
					name: comp.name,
					path: comp.path,
					type: comp.type,
				})),
				externalDependencies: [
					...compData.externalComponents,
					...compData.designSystemComponents,
					...compData.n8nPackageComponents,
				].map((comp) => ({
					name: comp.name,
					path: comp.originalPath,
					type: comp.type,
				})),
				usedBy: compData.usedBy,
				usageCount: compData.usedBy.length,
				totalLocalDependencies: compData.localComponents.length,
				totalExternalDependencies: compData.externalComponents.length + compData.designSystemComponents.length + compData.n8nPackageComponents.length,
			};
		}

		// Process external libraries
		for (const [libPath, libData] of this.externalDependencies) {
			tree.externalLibraries[libPath] = {
				type: libData.type,
				components: Array.from(libData.components),
				usedBy: Array.from(libData.usedBy),
				usageCount: libData.usedBy.size,
				componentCount: libData.components.size,
			};
		}

		return tree;
	}

	/**
	 * Format output as tree structure
	 */
	formatAsTree(tree) {
		let output = '📊 Enhanced Component Dependency Analysis\n';
		output += '='.repeat(60) + '\n\n';

		output += `📈 Summary:\n`;
		output += `  • Total Views: ${tree.summary.totalViews}\n`;
		output += `  • Total Components: ${tree.summary.totalComponents}\n`;
		output += `  • Total External Libraries: ${tree.summary.totalExternalLibraries}\n`;
		output += `  • Local Dependencies: ${tree.summary.totalLocalDependencies}\n`;
		output += `  • External Dependencies: ${tree.summary.totalExternalDependencies}\n\n`;

		output += '🏗️  VIEW DEPENDENCIES:\n';
		output += '─'.repeat(40) + '\n';

		for (const [viewPath, viewData] of Object.entries(tree.views)) {
			output += `\n📄 ${viewData.name} (${viewPath})\n`;
			output += `   📊 ${viewData.totalLocalComponents} local, ${viewData.totalExternalComponents} external\n`;
			
			// Local components
			if (viewData.localComponents.length > 0) {
				output += '   🏠 Local Components:\n';
				viewData.localComponents.forEach((comp, index) => {
					const isLast = index === viewData.localComponents.length - 1 && viewData.designSystemComponents.length === 0 && viewData.externalComponents.length === 0 && viewData.n8nPackageComponents.length === 0;
					const prefix = isLast ? '     └──' : '     ├──';
					output += `${prefix} 🧩 ${comp.name} (${comp.path})\n`;
				});
			}

			// Design system components
			if (viewData.designSystemComponents.length > 0) {
				output += '   🎨 Design System:\n';
				viewData.designSystemComponents.forEach((comp, index) => {
					const isLast = index === viewData.designSystemComponents.length - 1 && viewData.externalComponents.length === 0 && viewData.n8nPackageComponents.length === 0;
					const prefix = isLast ? '     └──' : '     ├──';
					output += `${prefix} 🧩 ${comp.name}\n`;
				});
			}

			// n8n packages
			if (viewData.n8nPackageComponents.length > 0) {
				output += '   📦 n8n Packages:\n';
				viewData.n8nPackageComponents.forEach((comp, index) => {
					const isLast = index === viewData.n8nPackageComponents.length - 1 && viewData.externalComponents.length === 0;
					const prefix = isLast ? '     └──' : '     ├──';
					output += `${prefix} 🧩 ${comp.name} (${comp.path})\n`;
				});
			}

			// External components
			if (viewData.externalComponents.length > 0) {
				output += '   🌐 External Libraries:\n';
				viewData.externalComponents.forEach((comp, index) => {
					const isLast = index === viewData.externalComponents.length - 1;
					const prefix = isLast ? '     └──' : '     ├──';
					output += `${prefix} 🧩 ${comp.name} (${comp.path})\n`;
				});
			}

			if (viewData.totalComponents === 0) {
				output += '     └── (no dependencies)\n';
			}
		}

		output += '\n\n🔄 LOCAL COMPONENT USAGE:\n';
		output += '─'.repeat(40) + '\n';

		// Sort components by usage count
		const sortedComponents = Object.entries(tree.components)
			.filter(([_, compData]) => compData.usageCount > 0)
			.sort(([, a], [, b]) => b.usageCount - a.usageCount);

		for (const [compPath, compData] of sortedComponents) { // Show all components
			output += `\n🧩 ${compData.name} (${compPath})\n`;
			output += `   📊 Used by ${compData.usageCount} file(s) | Depth: ${compData.depth} | Local: ${compData.totalLocalDependencies}, External: ${compData.totalExternalDependencies}\n`;
			compData.usedBy.forEach((usedByPath, index) => {
				const fileName = tree.views[usedByPath]?.name || tree.components[usedByPath]?.name || path.basename(usedByPath);
				const isLast = index === compData.usedBy.length - 1;
				const prefix = isLast ? '     └──' : '     ├──';
				output += `${prefix} 📄 ${fileName}\n`;
			});
		}

		output += '\n\n🌐 EXTERNAL LIBRARY USAGE:\n';
		output += '─'.repeat(40) + '\n';

		// Sort external libraries by usage
		const sortedExternals = Object.entries(tree.externalLibraries)
			.sort(([, a], [, b]) => b.usageCount - a.usageCount);

		const externalByType = {
			'design-system': [],
			'n8n-package': [],
			'external': []
		};

		sortedExternals.forEach(([libPath, libData]) => {
			externalByType[libData.type].push([libPath, libData]);
		});

		if (externalByType['design-system'].length > 0) {
			output += '\n🎨 Design System Components:\n';
			externalByType['design-system'].forEach(([libPath, libData]) => {
				output += `   📦 ${libPath} (${libData.componentCount} components, ${libData.usageCount} usages)\n`;
				output += `      Components: ${libData.components.join(', ')}\n`;
			});
		}

		if (externalByType['n8n-package'].length > 0) {
			output += '\n📦 n8n Packages:\n';
			externalByType['n8n-package'].forEach(([libPath, libData]) => {
				output += `   📦 ${libPath} (${libData.componentCount} components, ${libData.usageCount} usages)\n`;
			});
		}

		if (externalByType['external'].length > 0) {
			output += '\n🌐 Third-Party Libraries:\n';
			externalByType['external'].forEach(([libPath, libData]) => {
				output += `   📦 ${libPath} (${libData.componentCount} components, ${libData.usageCount} usages)\n`;
			});
		}

		return output;
	}

	/**
	 * Format output as table
	 */
	formatAsTable(tree) {
		let output = 'View,Local Components,Design System Components,n8n Package Components,External Components,Total Components\n';

		for (const [viewPath, viewData] of Object.entries(tree.views)) {
			const localComponents = viewData.localComponents.map((c) => c.name).join('; ');
			const designSystemComponents = viewData.designSystemComponents.map((c) => c.name).join('; ');
			const n8nPackageComponents = viewData.n8nPackageComponents.map((c) => c.name).join('; ');
			const externalComponents = viewData.externalComponents.map((c) => c.name).join('; ');
			
			output += `"${viewData.name}","${localComponents}","${designSystemComponents}","${n8nPackageComponents}","${externalComponents}",${viewData.totalComponents}\n`;
		}

		return output;
	}

	/**
	 * Main analysis function
	 */
	async analyze() {
		console.log('🔍 Analyzing component dependencies...\n');

		// Check if directories exist
		if (!fs.existsSync(VIEWS_DIR)) {
			throw new Error(`Views directory not found: ${VIEWS_DIR}`);
		}
		if (!fs.existsSync(COMPONENTS_DIR)) {
			throw new Error(`Components directory not found: ${COMPONENTS_DIR}`);
		}

		console.log('📁 Analyzing views...');
		this.analyzeViews();

		console.log('🧩 Analyzing components...');
		this.analyzeComponents();

		console.log('🏗️  Generating dependency tree...');
		const tree = this.generateDependencyTree();

		// Format output
		let output;
		switch (this.options.format) {
			case 'json':
				output = JSON.stringify(tree, null, 2);
				break;
			case 'table':
				output = this.formatAsTable(tree);
				break;
			case 'tree':
			default:
				output = this.formatAsTree(tree);
				break;
		}

		// Save to file if specified
		if (this.options.output) {
			fs.writeFileSync(this.options.output, output);
			console.log(`\n💾 Results saved to: ${this.options.output}`);
		}

		return { tree, output };
	}
}

// CLI interface
function parseArgs() {
	const args = process.argv.slice(2);
	const options = {};

	args.forEach((arg) => {
		if (arg.startsWith('--format=')) {
			options.format = arg.split('=')[1];
		} else if (arg.startsWith('--depth=')) {
			options.depth = parseInt(arg.split('=')[1], 10);
		} else if (arg.startsWith('--output=')) {
			options.output = arg.split('=')[1];
		} else if (arg === '--verbose') {
			options.verbose = true;
		} else if (arg === '--help' || arg === '-h') {
			console.log(`
Component Dependency Analysis Tool

Usage: node analyze-component-dependencies.js [options]

Options:
  --format=json|tree|table  Output format (default: tree)
  --depth=N                 Maximum depth to analyze (default: 5)
  --output=file             Save results to file
  --verbose                 Show detailed analysis
  --help, -h                Show this help message

Examples:
  node analyze-component-dependencies.js
  node analyze-component-dependencies.js --format=json --output=deps.json
  node analyze-component-dependencies.js --format=table --verbose
  node analyze-component-dependencies.js --depth=10 --verbose
      `);
			process.exit(0);
		}
	});

	return options;
}

// Main execution
if (require.main === module) {
	(async () => {
		try {
			const options = parseArgs();
			const analyzer = new ComponentDependencyAnalyzer(options);
			const { output } = await analyzer.analyze();

			if (!options.output) {
				console.log('\n' + output);
			}

			console.log('\n✅ Analysis complete!');
		} catch (error) {
			console.error('❌ Error:', error.message);
			process.exit(1);
		}
	})();
}

module.exports = ComponentDependencyAnalyzer;
