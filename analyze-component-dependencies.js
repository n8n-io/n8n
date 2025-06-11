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
	 * Extract Vue component imports and template usage from a Vue file
	 */
	extractImports(filePath) {
		try {
			const content = fs.readFileSync(filePath, 'utf8');
			const imports = [];

			// First, get explicit imports
			const explicitImports = this.extractExplicitImports(content);
			imports.push(...explicitImports);

			// Then, scan template for component usage (including implicit design system components)
			const templateComponents = this.extractTemplateComponents(content, explicitImports);
			imports.push(...templateComponents);

			return imports;
		} catch (error) {
			if (this.options.verbose) {
				console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
			}
			return [];
		}
	}

	/**
	 * Extract explicit component imports from a Vue file
	 */
	extractExplicitImports(content) {
		const imports = [];

		// Match import statements with various patterns - focus on Vue components
		const importPatterns = [
			// import Component from 'path'
			/import\s+(\w+)\s+from\s+['`"]([^'`"]+\.vue)['`"]/g,
			// import Component from '@/components/...'
			/import\s+(\w+)\s+from\s+['`"](@\/(?:components|views)\/[^'`"]+)['`"]/g,
			// import { Component1, Component2 } from 'path' (less common for Vue components)
			/import\s+\{\s*([^}]+)\s*\}\s+from\s+['`"]([^'`"]+\.vue)['`"]/g,
			// const Component = defineAsyncComponent(() => import('path'))
			/const\s+(\w+)\s*=\s*defineAsyncComponent\([^)]*import\s*\(\s*['`"]([^'`"]+\.vue)['`"]/g,
			// Design system destructured imports: import { N8nButton, N8nText } from '@n8n/design-system'
			/import\s+\{([^}]+)\}\s+from\s+['`"]@n8n\/design-system['`"]/g,
			// Design system default imports: import N8nButton from '@n8n/design-system/components/N8nButton'
			/import\s+(\w+)\s+from\s+['`"]@n8n\/design-system\/(?:components\/)?([^'`"]+?)(?:\/index)?['`"]/g,
			// Design system .vue file imports: import Component from '@n8n/design-system/components/Component/Component.vue'
			/import\s+(\w+)\s+from\s+['`"](@n8n\/design-system\/[^'`"]+\.vue)['`"]/g,
		];

		importPatterns.forEach((pattern, patternIndex) => {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				let importPath, componentNames, importType;
				
				// Handle different pattern types
				if (patternIndex === 4) {
					// Design system destructured imports: { N8nButton, N8nText }
					importPath = '@n8n/design-system';
					componentNames = match[1]
						.split(',')
						.map(c => c.trim())
						.filter(c => c && !c.includes('type ') && /^[A-Z]/.test(c)); // Only components starting with capital letter, exclude types
				} else if (patternIndex === 5) {
					// Design system default imports from component paths
					importPath = `@n8n/design-system/components/${match[2]}`;
					componentNames = [match[1]];
				} else if (patternIndex === 6) {
					// Design system .vue file imports
					importPath = match[2];
					componentNames = [match[1]];
				} else {
					// Regular patterns
					importPath = match[2];
					if (match[1].includes(',') || match[1].includes('{')) {
						// Handle destructured imports
						componentNames = match[1]
							.replace(/[{}]/g, '')
							.split(',')
							.map((c) => c.trim())
							.filter((c) => c);
					} else {
						componentNames = [match[1]];
					}
				}

				importType = this.categorizeImport(importPath);

				// Only process Vue component imports
				if (importType !== 'ignored') {
					componentNames.forEach((componentName) => {
						imports.push({
							name: componentName,
							path: this.normalizePath(importPath),
							type: importType,
							originalPath: importPath,
							source: 'import'
						});
					});
				}
			}
		});

		return imports;
	}

	/**
	 * Extract component usage from template section
	 */
	extractTemplateComponents(content, explicitImports) {
		const templateComponents = [];
		const explicitComponentNames = new Set(explicitImports.map(imp => imp.name));

		// Extract template section
		const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
		if (!templateMatch) return templateComponents;

		const templateContent = templateMatch[1];

		// Common n8n design system components (check both PascalCase and hyphenated)
		const designSystemComponents = [
			'N8nActionBox', 'N8nActionDropdown', 'N8nActionToggle', 'N8nAlert', 'N8nAvatar',
			'N8nBadge', 'N8nButton', 'N8nButtonGroup', 'N8nCallout', 'N8nCard', 'N8nCheckbox',
			'N8nColorPicker', 'N8nDatatable', 'N8nDatePicker', 'N8nFormBox', 'N8nFormInput',
			'N8nFormInputs', 'N8nHeading', 'N8nIcon', 'N8nIconButton', 'N8nInfoAccordion',
			'N8nInfoTip', 'N8nInput', 'N8nInputLabel', 'N8nInputNumber', 'N8nInlineTextEdit',
			'N8nKeyboardShortcut', 'N8nLink', 'N8nLoading', 'N8nMarkdown', 'N8nMenu', 'N8nMenuItem',
			'N8nNotice', 'N8nOption', 'N8nPagination', 'N8nPopover', 'N8nPulse', 'N8nRadioButtons',
			'N8nRecycleScroller', 'N8nSelect', 'N8nSpinner', 'N8nSticky', 'N8nTabs', 'N8nTag',
			'N8nTags', 'N8nText', 'N8nTextarea', 'N8nTooltip', 'N8nTree', 'N8nUserInfo',
			'N8nUserSelect', 'N8nUsersList'
		];

		// Create mapping of hyphenated to PascalCase
		const hyphenatedToPascalCase = {};
		designSystemComponents.forEach(component => {
			const hyphenated = component.replace(/([A-Z])/g, (match, letter, index) => {
				return index === 0 ? letter.toLowerCase() : '-' + letter.toLowerCase();
			});
			hyphenatedToPascalCase[hyphenated] = component;
		});

		// Check for PascalCase components (self-closing and with content)
		designSystemComponents.forEach(componentName => {
			if (explicitComponentNames.has(componentName)) return; // Skip if explicitly imported

			const patterns = [
				new RegExp(`<${componentName}(?:\\s[^>]*)?\\/?>`, 'g'),
				new RegExp(`<\\/${componentName}>`, 'g')
			];

			patterns.forEach(pattern => {
				if (pattern.test(templateContent)) {
					templateComponents.push({
						name: componentName,
						path: '@n8n/design-system',
						type: 'design-system',
						originalPath: '@n8n/design-system',
						source: 'template'
					});
				}
			});
		});

		// Check for hyphenated components
		Object.entries(hyphenatedToPascalCase).forEach(([hyphenated, pascalCase]) => {
			if (explicitComponentNames.has(pascalCase)) return; // Skip if explicitly imported
			if (templateComponents.some(tc => tc.name === pascalCase)) return; // Skip if already found

			const patterns = [
				new RegExp(`<${hyphenated}(?:\\s[^>]*)?\\/?>`, 'g'),
				new RegExp(`<\\/${hyphenated}>`, 'g')
			];

			patterns.forEach(pattern => {
				if (pattern.test(templateContent)) {
					templateComponents.push({
						name: pascalCase,
						path: '@n8n/design-system',
						type: 'design-system',
						originalPath: '@n8n/design-system',
						source: 'template'
					});
				}
			});
		});

		// Remove duplicates
		const uniqueComponents = [];
		const seen = new Set();
		
		templateComponents.forEach(comp => {
			const key = `${comp.name}|${comp.originalPath}`;
			if (!seen.has(key)) {
				seen.add(key);
				uniqueComponents.push(comp);
			}
		});

		return uniqueComponents;
	}

	/**
	 * Categorize import types - focusing only on Vue components
	 */
	categorizeImport(importPath) {
		// Only process local Vue components and views
		if (
			importPath.startsWith('./') ||
			importPath.startsWith('../') ||
			importPath.startsWith('@/components') ||
			importPath.startsWith('@/views') ||
			importPath.startsWith('~/components') ||
			importPath.startsWith('~/views')
		) {
			return 'local';
		}

		// Design system components - all patterns
		if (importPath.startsWith('@n8n/design-system')) {
			return 'design-system';
		}

		// Ignore everything else (stores, composables, utilities, third-party, etc.)
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
			
			// Categorize imports by type - only Vue components
			const localComponents = imports.filter((imp) => imp.type === 'local');
			const designSystemComponents = imports.filter((imp) => imp.type === 'design-system');

			this.viewDependencies.set(viewFile.path, {
				name: viewFile.name,
				fullPath: viewFile.fullPath,
				imports: imports,
				localComponents,
				designSystemComponents,
				allComponents: [...localComponents, ...designSystemComponents],
			});

			// Build reverse index for all Vue components
			[...localComponents, ...designSystemComponents].forEach((imp) => {
				if (!this.reverseIndex.has(imp.path)) {
					this.reverseIndex.set(imp.path, []);
				}
				this.reverseIndex.get(imp.path).push(viewFile.path);
			});

			// Track design system dependencies if any
			designSystemComponents.forEach((imp) => {
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
			
			// Categorize imports by type - only Vue components
			const localComponents = imports.filter((imp) => imp.type === 'local');
			const designSystemComponents = imports.filter((imp) => imp.type === 'design-system');

			this.componentDependencies.set(componentFile.path, {
				name: componentFile.name,
				fullPath: componentFile.fullPath,
				imports: imports,
				localComponents,
				designSystemComponents,
				allComponents: [...localComponents, ...designSystemComponents],
				usedBy: this.reverseIndex.get(componentFile.path) || [],
				depth: depth,
			});

			// Update reverse index for newly found Vue components
			[...localComponents, ...designSystemComponents].forEach((imp) => {
				if (!this.reverseIndex.has(imp.path)) {
					this.reverseIndex.set(imp.path, []);
				}
				if (!this.reverseIndex.get(imp.path).includes(componentFile.path)) {
					this.reverseIndex.get(imp.path).push(componentFile.path);
				}
			});

			// Track design system dependencies from components
			designSystemComponents.forEach((imp) => {
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
				totalDesignSystemLibraries: this.externalDependencies.size,
				totalLocalDependencies: 0,
				totalDesignSystemDependencies: 0,
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
				designSystemComponents: viewData.designSystemComponents.map((comp) => ({
					name: comp.name,
					path: comp.originalPath,
					type: comp.type,
				})),
				totalLocalComponents: viewData.localComponents.length,
				totalDesignSystemComponents: viewData.designSystemComponents.length,
				totalComponents: viewData.allComponents.length,
			};
			tree.summary.totalLocalDependencies += viewData.localComponents.length;
			tree.summary.totalDesignSystemDependencies += viewData.designSystemComponents.length;
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
				designSystemDependencies: compData.designSystemComponents.map((comp) => ({
					name: comp.name,
					path: comp.originalPath,
					type: comp.type,
				})),
				usedBy: compData.usedBy,
				usageCount: compData.usedBy.length,
				totalLocalDependencies: compData.localComponents.length,
				totalDesignSystemDependencies: compData.designSystemComponents.length,
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
		let output = '📊 Vue Component Dependency Analysis\n';
		output += '='.repeat(60) + '\n\n';

		output += `📈 Summary:\n`;
		output += `  • Total Views: ${tree.summary.totalViews}\n`;
		output += `  • Total Components: ${tree.summary.totalComponents}\n`;
		output += `  • Design System Components: ${tree.summary.totalDesignSystemLibraries}\n`;
		output += `  • Local Vue Dependencies: ${tree.summary.totalLocalDependencies}\n`;
		output += `  • Design System Dependencies: ${tree.summary.totalDesignSystemDependencies}\n\n`;

		output += '🏗️  VIEW DEPENDENCIES:\n';
		output += '─'.repeat(40) + '\n';

		for (const [viewPath, viewData] of Object.entries(tree.views)) {
			output += `\n📄 ${viewData.name} (${viewPath})\n`;
			output += `   📊 ${viewData.totalLocalComponents} local, ${viewData.totalDesignSystemComponents} design system\n`;
			
			// Local components
			if (viewData.localComponents.length > 0) {
				output += '   🏠 Local Components:\n';
				viewData.localComponents.forEach((comp, index) => {
					const isLast = index === viewData.localComponents.length - 1 && viewData.designSystemComponents.length === 0;
					const prefix = isLast ? '     └──' : '     ├──';
					output += `${prefix} 🧩 ${comp.name} (${comp.path})\n`;
				});
			}

			// Design system components  
			if (viewData.designSystemComponents.length > 0) {
				output += '   🎨 Design System:\n';
				viewData.designSystemComponents.forEach((comp, index) => {
					const isLast = index === viewData.designSystemComponents.length - 1;
					const prefix = isLast ? '     └──' : '     ├──';
					output += `${prefix} 🧩 ${comp.name}\n`;
				});
			}

			if (viewData.totalComponents === 0) {
				output += '     └── (no Vue component dependencies)\n';
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
			output += `   📊 Used by ${compData.usageCount} file(s) | Depth: ${compData.depth} | Local: ${compData.totalLocalDependencies}, Design System: ${compData.totalDesignSystemDependencies}\n`;
			compData.usedBy.forEach((usedByPath, index) => {
				const fileName = tree.views[usedByPath]?.name || tree.components[usedByPath]?.name || path.basename(usedByPath);
				const isLast = index === compData.usedBy.length - 1;
				const prefix = isLast ? '     └──' : '     ├──';
				output += `${prefix} 📄 ${fileName}\n`;
			});
		}

		if (Object.keys(tree.externalLibraries).length > 0) {
			output += '\n\n🎨 DESIGN SYSTEM USAGE:\n';
			output += '─'.repeat(40) + '\n';

			// Sort external libraries by usage
			const sortedExternals = Object.entries(tree.externalLibraries)
				.sort(([, a], [, b]) => b.usageCount - a.usageCount);

			sortedExternals.forEach(([libPath, libData]) => {
				output += `\n📦 ${libPath}\n`;
				output += `   📊 ${libData.componentCount} components, ${libData.usageCount} usages\n`;
				output += `   Components: ${libData.components.join(', ')}\n`;
			});
		}

		return output;
	}

	/**
	 * Format output as table
	 */
	formatAsTable(tree) {
		let output = 'View,Local Components,Design System Components,Total Components\n';

		for (const [viewPath, viewData] of Object.entries(tree.views)) {
			const localComponents = viewData.localComponents.map((c) => c.name).join('; ');
			const designSystemComponents = viewData.designSystemComponents.map((c) => c.name).join('; ');
			
			output += `"${viewData.name}","${localComponents}","${designSystemComponents}",${viewData.totalComponents}\n`;
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