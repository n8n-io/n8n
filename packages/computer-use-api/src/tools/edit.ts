import { BaseTool, ToolError } from './base';
import { EditAction, EditActionSchema, ToolResult } from '../types';
import { promises as fs } from 'fs';
import { stat, readdir } from 'fs/promises';
import { join } from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class EditTool extends BaseTool {
	name = 'str_replace_editor';

	private fileHistory: Map<string, string[]> = new Map();

	async execute(input: Record<string, any>): Promise<ToolResult> {
		const validated = EditActionSchema.parse(input);
		return this.handleAction(validated);
	}

	private async handleAction(action: EditAction): Promise<ToolResult> {
		try {
			// Validate path is absolute
			if (!action.path.startsWith('/')) {
				throw new ToolError('Path must be absolute (start with /)');
			}

			switch (action.command) {
				case 'view':
					return await this.view(action.path, action.view_range);

				case 'create':
					return await this.create(action.path, action.file_text);

				case 'str_replace':
					return await this.strReplace(action.path, action.old_str, action.new_str);

				case 'insert':
					return await this.insert(action.path, action.insert_line, action.new_str);

				case 'undo_edit':
					return await this.undoEdit(action.path);

				default:
					throw new ToolError(`Unknown command: ${(action as any).command}`);
			}
		} catch (error) {
			if (error instanceof ToolError) {
				return { error: error.message };
			}
			return { error: `Edit tool error: ${error}` };
		}
	}

	private async view(path: string, viewRange?: [number, number]): Promise<ToolResult> {
		try {
			const stats = await stat(path);

			// If directory, show structure
			if (stats.isDirectory()) {
				const structure = await this.getDirectoryStructure(path, 2);
				return { output: `Directory: ${path}\n${structure}` };
			}

			// Check file size
			if (stats.size > MAX_FILE_SIZE) {
				return {
					error: `File too large (${stats.size} bytes). Use view_range to view specific lines.`,
				};
			}

			// Read file
			const content = await fs.readFile(path, 'utf-8');
			const lines = content.split('\n');

			// Apply view range if specified
			let startLine = 1;
			let endLine = lines.length;

			if (viewRange) {
				[startLine, endLine] = viewRange;
				if (startLine < 1 || endLine > lines.length || startLine > endLine) {
					throw new ToolError('Invalid view range');
				}
			}

			// Format with line numbers
			const numberedLines = lines
				.slice(startLine - 1, endLine)
				.map((line, idx) => `${startLine + idx}\t${line}`)
				.join('\n');

			const rangeInfo = viewRange
				? `\nShowing lines ${startLine}-${endLine} of ${lines.length}`
				: `\nTotal lines: ${lines.length}`;

			return { output: `${path}${rangeInfo}\n${numberedLines}` };
		} catch (error: any) {
			if (error.code === 'ENOENT') {
				return { error: `File or directory not found: ${path}` };
			}
			throw error;
		}
	}

	private async getDirectoryStructure(
		dirPath: string,
		maxDepth: number,
		currentDepth = 0,
	): Promise<string> {
		if (currentDepth >= maxDepth) {
			return '';
		}

		const entries = await readdir(dirPath, { withFileTypes: true });
		const lines: string[] = [];

		for (const entry of entries) {
			const indent = '  '.repeat(currentDepth);
			const prefix = entry.isDirectory() ? '📁' : '📄';
			lines.push(`${indent}${prefix} ${entry.name}`);

			if (entry.isDirectory() && currentDepth < maxDepth - 1) {
				const subPath = join(dirPath, entry.name);
				const subStructure = await this.getDirectoryStructure(subPath, maxDepth, currentDepth + 1);
				if (subStructure) {
					lines.push(subStructure);
				}
			}
		}

		return lines.join('\n');
	}

	private async create(path: string, fileText: string): Promise<ToolResult> {
		try {
			// Check if file exists
			const exists = await fs
				.access(path)
				.then(() => true)
				.catch(() => false);

			if (exists) {
				throw new ToolError(`File already exists: ${path}. Use str_replace to edit.`);
			}

			// Check if path is directory
			const stats = await stat(path).catch(() => null);
			if (stats?.isDirectory()) {
				throw new ToolError('Cannot create file: path is a directory');
			}

			// Write file
			await fs.writeFile(path, fileText, 'utf-8');

			// Save to history
			this.saveToHistory(path, '');

			return { output: `File created: ${path}\n${fileText.length} characters written` };
		} catch (error: any) {
			if (error instanceof ToolError) {
				throw error;
			}
			throw new ToolError(`Failed to create file: ${error.message}`);
		}
	}

	private async strReplace(path: string, oldStr: string, newStr: string): Promise<ToolResult> {
		const content = await fs.readFile(path, 'utf-8');

		// Expand tabs for consistency
		const oldStrExpanded = oldStr.replace(/\t/g, '    ');
		const contentExpanded = content.replace(/\t/g, '    ');

		// Check if old_str exists
		const occurrences = this.countOccurrences(contentExpanded, oldStrExpanded);

		if (occurrences === 0) {
			return { error: `String not found in file:\n${oldStr}` };
		}

		if (occurrences > 1) {
			return {
				error: `String appears ${occurrences} times in file. Please provide more context to make it unique.`,
			};
		}

		// Save to history before modification
		this.saveToHistory(path, content);

		// Replace
		const newContent = contentExpanded.replace(oldStrExpanded, newStr);

		// Write back
		await fs.writeFile(path, newContent, 'utf-8');

		return {
			output: `Successfully replaced:\n${oldStr}\nWith:\n${newStr}\n\nFile: ${path}`,
		};
	}

	private async insert(path: string, insertLine: number, newStr: string): Promise<ToolResult> {
		const content = await fs.readFile(path, 'utf-8');
		const lines = content.split('\n');

		if (insertLine < 0 || insertLine > lines.length) {
			throw new ToolError(`Invalid line number: ${insertLine}`);
		}

		// Save to history
		this.saveToHistory(path, content);

		// Insert (before the specified line)
		lines.splice(insertLine, 0, newStr);

		// Write back
		const newContent = lines.join('\n');
		await fs.writeFile(path, newContent, 'utf-8');

		// Show context (4 lines before and after)
		const contextStart = Math.max(0, insertLine - 4);
		const contextEnd = Math.min(lines.length, insertLine + 5);
		const context = lines
			.slice(contextStart, contextEnd)
			.map((line, idx) => {
				const lineNum = contextStart + idx + 1;
				const marker = lineNum === insertLine + 1 ? '>' : ' ';
				return `${marker} ${lineNum}\t${line}`;
			})
			.join('\n');

		return {
			output: `Inserted at line ${insertLine}:\n${newStr}\n\nContext:\n${context}`,
		};
	}

	private async undoEdit(path: string): Promise<ToolResult> {
		const history = this.fileHistory.get(path);

		if (!history || history.length === 0) {
			return { error: 'No edit history available for this file' };
		}

		// Get previous version
		const previousContent = history.pop()!;

		// Write back
		await fs.writeFile(path, previousContent, 'utf-8');

		return {
			output: `Reverted ${path} to previous version\nRemaining undo steps: ${history.length}`,
		};
	}

	private countOccurrences(text: string, search: string): number {
		let count = 0;
		let pos = 0;

		while ((pos = text.indexOf(search, pos)) !== -1) {
			count++;
			pos += search.length;
		}

		return count;
	}

	private saveToHistory(path: string, content: string): void {
		if (!this.fileHistory.has(path)) {
			this.fileHistory.set(path, []);
		}

		const history = this.fileHistory.get(path)!;
		history.push(content);

		// Keep only last 10 versions
		if (history.length > 10) {
			history.shift();
		}
	}
}
