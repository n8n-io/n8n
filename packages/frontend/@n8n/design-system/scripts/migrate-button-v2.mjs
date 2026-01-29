#!/usr/bin/env node

/**
 * Button V2 Migration Codemod
 *
 * This script migrates N8nButton components from the legacy V1 API to the V2 API.
 *
 * Transformations:
 * - type="primary" → variant="solid"
 * - type="secondary" → variant="subtle"
 * - type="tertiary" → variant="subtle"
 * - type="danger" → variant="destructive"
 * - type="success" → variant="solid" class="n8n-button--success"
 * - type="warning" → variant="solid" class="n8n-button--warning"
 * - type="highlight" → variant="ghost" class="n8n-button--highlight"
 * - type="highlightFill" → variant="subtle" class="n8n-button--highlightFill"
 * - outline prop → variant="outline"
 * - text prop → variant="ghost"
 * - size="xmini"|"mini" → size="xsmall"
 * - square → iconOnly
 * - nativeType → type attribute
 * - block → style="width: 100%"
 * - element="a" → (removed, href determines element)
 * Usage:
 *   node migrate-button-v2.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const FRONTEND_ROOT = join(__dirname, '../../..');
const DRY_RUN = process.argv.includes('--dry-run');

// Mapping from legacy type to new variant
const TYPE_TO_VARIANT = {
	primary: 'solid',
	secondary: 'subtle',
	tertiary: 'subtle',
	danger: 'destructive',
};

// Legacy types that need override classes
const LEGACY_TYPES_WITH_CLASSES = {
	success: { variant: 'solid', className: 'n8n-button--success' },
	warning: { variant: 'solid', className: 'n8n-button--warning' },
	highlight: { variant: 'ghost', className: 'n8n-button--highlight' },
	highlightFill: { variant: 'subtle', className: 'n8n-button--highlightFill' },
};

// Size normalization
const SIZE_MAP = {
	xmini: 'xsmall',
	mini: 'xsmall',
};

// Stats
const stats = {
	filesScanned: 0,
	filesModified: 0,
	transformations: {
		typeToVariant: 0,
		legacyTypeWithClass: 0,
		outlineToVariant: 0,
		textToVariant: 0,
		sizeNormalized: 0,
		squareToIconOnly: 0,
		nativeTypeToType: 0,
		blockToStyle: 0,
		elementRemoved: 0,
	},
};

/**
 * Find all .vue files recursively
 */
function findVueFiles(dir, files = []) {
	const entries = readdirSync(dir);

	for (const entry of entries) {
		const fullPath = join(dir, entry);

		// Skip node_modules and hidden directories
		if (entry === 'node_modules' || entry.startsWith('.')) continue;

		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			findVueFiles(fullPath, files);
		} else if (entry.endsWith('.vue')) {
			files.push(fullPath);
		}
	}

	return files;
}

/**
 * Transform a single N8nButton tag
 */
function transformButtonTag(fullMatch, tagContent, selfClosing, content, closingTag) {
	let modified = false;
	const changes = [];

	// Track what we need to add
	let newVariant = null;
	let addClass = null;
	let addStyle = null;

	// Parse current attributes
	const hasType = /\btype=["']([^"']+)["']/.exec(tagContent);
	const hasVariant = /\bvariant=["']/.test(tagContent);
	const hasOutline = /\boutline(?:=["']true["'])?(?=\s|\/?>|\s)/.test(tagContent);
	const hasText = /\btext(?:=["']true["'])?(?=\s|\/?>|\s)/.test(tagContent);
	const hasSize = /\bsize=["']([^"']+)["']/.exec(tagContent);
	const hasSquare = /\bsquare(?:=["']true["'])?(?=\s|\/?>|\s)/.test(tagContent);
	const hasNativeType = /\bnativeType=["']([^"']+)["']/.exec(tagContent);
	const hasBlock = /\bblock(?:=["']true["'])?(?=\s|\/?>|\s)/.test(tagContent);
	const hasElement = /\belement=["']([^"']+)["']/.exec(tagContent);
	const hasClass = /\bclass=["']([^"']+)["']/.exec(tagContent);
	const hasStyle = /\bstyle=["']([^"']+)["']/.exec(tagContent);

	// Skip if already using variant (already migrated)
	if (hasVariant) {
		return fullMatch;
	}

	// 1. Handle outline prop → variant="outline"
	if (hasOutline && !hasText) {
		newVariant = 'outline';
		tagContent = tagContent.replace(/\s*\boutline(?:=["']true["'])?(?=\s|\/?>)/, '');
		// Also remove type if present since outline takes precedence
		if (hasType) {
			tagContent = tagContent.replace(/\s*\btype=["'][^"']+["']/, '');
		}
		changes.push('outline → variant="outline"');
		stats.transformations.outlineToVariant++;
		modified = true;
	}
	// 2. Handle text prop → variant="ghost"
	else if (hasText) {
		newVariant = 'ghost';
		tagContent = tagContent.replace(/\s*\btext(?:=["']true["'])?(?=\s|\/?>)/, '');
		// Also remove type and outline if present
		if (hasType) {
			tagContent = tagContent.replace(/\s*\btype=["'][^"']+["']/, '');
		}
		if (hasOutline) {
			tagContent = tagContent.replace(/\s*\boutline(?:=["']true["'])?(?=\s|\/?>)/, '');
		}
		changes.push('text → variant="ghost"');
		stats.transformations.textToVariant++;
		modified = true;
	}
	// 3. Handle type prop
	else if (hasType) {
		const typeValue = hasType[1];

		if (TYPE_TO_VARIANT[typeValue]) {
			// Direct mapping
			newVariant = TYPE_TO_VARIANT[typeValue];
			tagContent = tagContent.replace(/\s*\btype=["'][^"']+["']/, '');
			changes.push(`type="${typeValue}" → variant="${newVariant}"`);
			stats.transformations.typeToVariant++;
			modified = true;
		} else if (LEGACY_TYPES_WITH_CLASSES[typeValue]) {
			// Legacy type with class override
			const mapping = LEGACY_TYPES_WITH_CLASSES[typeValue];
			newVariant = mapping.variant;
			addClass = mapping.className;
			tagContent = tagContent.replace(/\s*\btype=["'][^"']+["']/, '');
			changes.push(`type="${typeValue}" → variant="${newVariant}" + class="${addClass}"`);
			stats.transformations.legacyTypeWithClass++;
			modified = true;
		}
	}

	// 4. Handle size normalization
	if (hasSize && SIZE_MAP[hasSize[1]]) {
		const oldSize = hasSize[1];
		const newSize = SIZE_MAP[oldSize];
		tagContent = tagContent.replace(/\bsize=["'][^"']+["']/, `size="${newSize}"`);
		changes.push(`size="${oldSize}" → size="${newSize}"`);
		stats.transformations.sizeNormalized++;
		modified = true;
	}

	// 5. Handle square → iconOnly
	if (hasSquare) {
		tagContent = tagContent.replace(/\s*\bsquare(?:=["']true["'])?(?=\s|\/?>)/, '');
		// Add iconOnly attribute
		tagContent = tagContent.replace(/(N8nButton|n8n-button)/, '$1 iconOnly');
		changes.push('square → iconOnly');
		stats.transformations.squareToIconOnly++;
		modified = true;
	}

	// 6. Handle nativeType → type
	if (hasNativeType) {
		const nativeTypeValue = hasNativeType[1];
		tagContent = tagContent.replace(/\s*\bnativeType=["'][^"']+["']/, '');
		tagContent = tagContent.replace(/(N8nButton|n8n-button)/, `$1 type="${nativeTypeValue}"`);
		changes.push(`nativeType="${nativeTypeValue}" → type="${nativeTypeValue}"`);
		stats.transformations.nativeTypeToType++;
		modified = true;
	}

	// 7. Handle block → style="width: 100%"
	if (hasBlock) {
		tagContent = tagContent.replace(/\s*\bblock(?:=["']true["'])?(?=\s|\/?>)/, '');
		addStyle = 'width: 100%';
		changes.push('block → style="width: 100%"');
		stats.transformations.blockToStyle++;
		modified = true;
	}

	// 8. Handle element="a" → remove (href determines element)
	if (hasElement) {
		tagContent = tagContent.replace(/\s*\belement=["'][^"']+["']/, '');
		changes.push('element removed (href determines element)');
		stats.transformations.elementRemoved++;
		modified = true;
	}

	if (!modified) {
		return fullMatch;
	}

	// Now apply the collected changes

	// Add variant attribute
	if (newVariant) {
		tagContent = tagContent.replace(/(N8nButton|n8n-button)/, `$1 variant="${newVariant}"`);
	}

	// Merge class attribute
	if (addClass) {
		if (hasClass) {
			// Merge with existing class
			tagContent = tagContent.replace(/\bclass=["']([^"']+)["']/, `class="$1 ${addClass}"`);
		} else {
			// Add new class attribute
			tagContent = tagContent.replace(/(N8nButton|n8n-button)/, `$1 class="${addClass}"`);
		}
	}

	// Merge style attribute
	if (addStyle) {
		if (hasStyle) {
			// Merge with existing style
			const existingStyle = hasStyle[1].trim();
			const separator = existingStyle.endsWith(';') ? ' ' : '; ';
			tagContent = tagContent.replace(
				/\bstyle=["']([^"']+)["']/,
				`style="$1${separator}${addStyle}"`,
			);
		} else {
			// Add new style attribute
			tagContent = tagContent.replace(/(N8nButton|n8n-button)/, `$1 style="${addStyle}"`);
		}
	}

	// Build the new tag
	let result;
	if (selfClosing) {
		result = `<${tagContent.trim()} />`;
	} else {
		result = `<${tagContent.trim()}>${content || ''}${closingTag}`;
	}

	// Log the transformation
	console.log(`  ${changes.join(', ')}`);

	return result;
}

/**
 * Transform all N8nButton usages in a file
 */
function transformFile(filePath) {
	const content = readFileSync(filePath, 'utf-8');
	stats.filesScanned++;

	// Find template section
	const templateMatch = /<template[^>]*>([\s\S]*?)<\/template>/i.exec(content);
	if (!templateMatch) {
		return { modified: false };
	}

	const templateStart = templateMatch.index;
	const templateContent = templateMatch[1];

	// Match N8nButton and n8n-button tags (both self-closing and with content)
	// This regex handles:
	// 1. Self-closing: <N8nButton ... />
	// 2. With content: <N8nButton ...>content</N8nButton>
	const buttonRegex = /<(N8nButton|n8n-button)\s([^>]*?)\s*\/>/gi;
	const buttonWithContentRegex = /<(N8nButton|n8n-button)\s([^>]*?)>([\s\S]*?)<\/\1>/gi;

	let newTemplateContent = templateContent;
	let hasChanges = false;

	// Process self-closing buttons first
	newTemplateContent = newTemplateContent.replace(
		/<(N8nButton|n8n-button)\s+([^>]*?)\s*\/>/gi,
		(match, tagName, attrs) => {
			const result = transformButtonTag(match, `${tagName} ${attrs}`, true, null, null);
			if (result !== match) hasChanges = true;
			return result;
		},
	);

	// Process buttons with content
	newTemplateContent = newTemplateContent.replace(
		/<(N8nButton|n8n-button)(\s[^>]*)?>([\s\S]*?)<\/(N8nButton|n8n-button)>/gi,
		(match, tagName, attrs, content, closeTag) => {
			const result = transformButtonTag(
				match,
				`${tagName}${attrs || ''}`,
				false,
				content,
				`</${closeTag}>`,
			);
			if (result !== match) hasChanges = true;
			return result;
		},
	);

	if (!hasChanges) {
		return { modified: false };
	}

	// Reconstruct the file
	const newContent =
		content.slice(0, templateStart) +
		'<template>' +
		newTemplateContent +
		'</template>' +
		content.slice(templateStart + templateMatch[0].length);

	return { modified: true, content: newContent };
}

/**
 * Main function
 */
async function main() {
	console.log('Button V2 Migration Codemod');
	console.log('===========================');
	console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files will be modified)' : 'LIVE'}`);
	console.log(`Scanning: ${FRONTEND_ROOT}`);
	console.log('');

	const vueFiles = findVueFiles(FRONTEND_ROOT);
	console.log(`Found ${vueFiles.length} Vue files\n`);

	for (const filePath of vueFiles) {
		const relativePath = relative(FRONTEND_ROOT, filePath);

		try {
			const result = transformFile(filePath);

			if (result.modified) {
				console.log(`\nModified: ${relativePath}`);
				stats.filesModified++;

				if (!DRY_RUN) {
					writeFileSync(filePath, result.content, 'utf-8');
				}
			}
		} catch (error) {
			console.error(`Error processing ${relativePath}:`, error.message);
		}
	}

	// Print summary
	console.log('\n===========================');
	console.log('Summary');
	console.log('===========================');
	console.log(`Files scanned: ${stats.filesScanned}`);
	console.log(`Files modified: ${stats.filesModified}`);
	console.log('');
	console.log('Transformations:');
	console.log(`  type → variant: ${stats.transformations.typeToVariant}`);
	console.log(`  legacy type + class: ${stats.transformations.legacyTypeWithClass}`);
	console.log(`  outline → variant: ${stats.transformations.outlineToVariant}`);
	console.log(`  text → variant: ${stats.transformations.textToVariant}`);
	console.log(`  size normalized: ${stats.transformations.sizeNormalized}`);
	console.log(`  square → iconOnly: ${stats.transformations.squareToIconOnly}`);
	console.log(`  nativeType → type: ${stats.transformations.nativeTypeToType}`);
	console.log(`  block → style: ${stats.transformations.blockToStyle}`);
	console.log(`  element removed: ${stats.transformations.elementRemoved}`);

	if (DRY_RUN) {
		console.log('\nDry run complete. No files were modified.');
		console.log('Run without --dry-run to apply changes.');
	}
}

main().catch(console.error);
