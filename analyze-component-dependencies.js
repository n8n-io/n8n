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
			depth: 3,
			output: null,
			verbose: false,
			...options,
		};

		this.viewDependencies = new Map();
		this.componentDependencies = new Map();
		this.reverseIndex = new Map(); // component -> views that use it
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

					// Skip external library imports
					if (this.isLocalImport(importPath)) {
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
									type: 'component',
								});
							});
						} else {
							imports.push({
								name: match[1],
								path: this.normalizePath(importPath),
								type: 'component',
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
	 * Check if an import path is local (not from node_modules)
	 */
	isLocalImport(importPath) {
		return (
			importPath.startsWith('./') ||
			importPath.startsWith('../') ||
			importPath.startsWith('@/') ||
			importPath.startsWith('~/') ||
			(!importPath.includes('node_modules') && !this.isExternalLibrary(importPath))
		);
	}

	/**
	 * Check if import is from an external library
	 */
	isExternalLibrary(importPath) {
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
			'n8n-workflow',
			'n8n-core',
			'n8n-design-system',
		];
		return externalLibs.some((lib) => importPath.startsWith(lib));
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
			this.viewDependencies.set(viewFile.path, {
				name: viewFile.name,
				fullPath: viewFile.fullPath,
				imports: imports,
				components: imports.filter((imp) => this.isComponentImport(imp.path)),
			});

			// Build reverse index
			imports.forEach((imp) => {
				if (this.isComponentImport(imp.path)) {
					if (!this.reverseIndex.has(imp.path)) {
						this.reverseIndex.set(imp.path, []);
					}
					this.reverseIndex.get(imp.path).push(viewFile.path);
				}
			});
		}
	}

	/**
	 * Analyze component dependencies recursively
	 */
	analyzeComponents(depth = 0) {
		if (depth >= this.options.depth) return;

		const componentFiles = this.getVueFiles(COMPONENTS_DIR, 'components');

		for (const componentFile of componentFiles) {
			if (this.componentDependencies.has(componentFile.path)) continue;

			const imports = this.extractImports(componentFile.fullPath);
			this.componentDependencies.set(componentFile.path, {
				name: componentFile.name,
				fullPath: componentFile.fullPath,
				imports: imports,
				components: imports.filter((imp) => this.isComponentImport(imp.path)),
				usedBy: this.reverseIndex.get(componentFile.path) || [],
			});
		}

		// Recursively analyze imported components
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
			summary: {
				totalViews: this.viewDependencies.size,
				totalComponents: this.componentDependencies.size,
				totalDependencies: 0,
			},
		};

		// Process views
		for (const [viewPath, viewData] of this.viewDependencies) {
			tree.views[viewPath] = {
				name: viewData.name,
				components: viewData.components.map((comp) => ({
					name: comp.name,
					path: comp.path,
				})),
				totalComponents: viewData.components.length,
			};
			tree.summary.totalDependencies += viewData.components.length;
		}

		// Process components
		for (const [compPath, compData] of this.componentDependencies) {
			tree.components[compPath] = {
				name: compData.name,
				dependencies: compData.components.map((comp) => ({
					name: comp.name,
					path: comp.path,
				})),
				usedBy: compData.usedBy,
				usageCount: compData.usedBy.length,
			};
		}

		return tree;
	}

	/**
	 * Format output as tree structure
	 */
	formatAsTree(tree) {
		let output = '📊 Component Dependency Analysis\n';
		output += '='.repeat(50) + '\n\n';

		output += `📈 Summary:\n`;
		output += `  • Total Views: ${tree.summary.totalViews}\n`;
		output += `  • Total Components: ${tree.summary.totalComponents}\n`;
		output += `  • Total Dependencies: ${tree.summary.totalDependencies}\n\n`;

		output += '🏗️  VIEW DEPENDENCIES:\n';
		output += '─'.repeat(30) + '\n';

		for (const [viewPath, viewData] of Object.entries(tree.views)) {
			output += `\n📄 ${viewData.name} (${viewPath})\n`;
			if (viewData.components.length === 0) {
				output += '  └── (no local components)\n';
			} else {
				viewData.components.forEach((comp, index) => {
					const isLast = index === viewData.components.length - 1;
					const prefix = isLast ? '  └──' : '  ├──';
					output += `${prefix} 🧩 ${comp.name} (${comp.path})\n`;
				});
			}
		}

		output += '\n\n🔄 COMPONENT USAGE:\n';
		output += '─'.repeat(30) + '\n';

		// Sort components by usage count
		const sortedComponents = Object.entries(tree.components)
			.filter(([_, compData]) => compData.usageCount > 0)
			.sort(([, a], [, b]) => b.usageCount - a.usageCount);

		for (const [compPath, compData] of sortedComponents) {
			output += `\n🧩 ${compData.name} (${compPath})\n`;
			output += `  📊 Used by ${compData.usageCount} view(s):\n`;
			compData.usedBy.forEach((viewPath, index) => {
				const viewName = tree.views[viewPath]?.name || path.basename(viewPath);
				const isLast = index === compData.usedBy.length - 1;
				const prefix = isLast ? '    └──' : '    ├──';
				output += `${prefix} 📄 ${viewName}\n`;
			});
		}

		return output;
	}

	/**
	 * Format output as table
	 */
	formatAsTable(tree) {
		let output = 'View,Component Count,Components\n';

		for (const [viewPath, viewData] of Object.entries(tree.views)) {
			const components = viewData.components.map((c) => c.name).join('; ');
			output += `"${viewData.name}",${viewData.totalComponents},"${components}"\n`;
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
  --depth=N                 Maximum depth to analyze (default: 3)
  --output=file             Save results to file
  --verbose                 Show detailed analysis
  --help, -h                Show this help message

Examples:
  node analyze-component-dependencies.js
  node analyze-component-dependencies.js --format=json --output=deps.json
  node analyze-component-dependencies.js --format=table --verbose
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
