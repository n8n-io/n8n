import crypto from 'crypto';
import path from 'path';

/**
 * Generate an output file path with timestamp and unique ID.
 *
 * @param inputPath - The original input file path
 * @param newExtension - The new file extension (e.g., '.ts' or '.json')
 * @returns Output path in format: {dir}/{baseName}_{timestamp}_{uniqueId}{newExtension}
 *
 * @example
 * generateOutputPath('/path/to/workflow.json', '.ts')
 * // Returns: '/path/to/workflow_2026-02-02T15-30-45-123Z_a1b2c3d4.ts'
 */
export function generateOutputPath(inputPath: string, newExtension: string): string {
	const dir = path.dirname(inputPath);
	const baseName = path.basename(inputPath, path.extname(inputPath));
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const uniqueId = crypto.randomBytes(4).toString('hex');

	return path.join(dir, `${baseName}_${timestamp}_${uniqueId}${newExtension}`);
}
