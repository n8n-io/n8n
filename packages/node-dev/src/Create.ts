import { copyFile } from 'fs/promises';
import { replaceInFile } from 'replace-in-file';

/**
 * Creates a new credentials or node
 *
 * @param {string} sourceFilePath The path to the source template file
 * @param {string} destinationFilePath The path the write the new file to
 * @param {object} replaceValues The values to replace in the template file
 */
export async function createTemplate(
	sourceFilePath: string,
	destinationFilePath: string,
	replaceValues: Record<string, string>,
): Promise<void> {
	// Copy the file to then replace the values in it

	await copyFile(sourceFilePath, destinationFilePath);

	// Replace the variables in the template file
	await replaceInFile({
		files: [destinationFilePath],
		from: Object.keys(replaceValues).map((key) => new RegExp(key, 'g')),
		to: Object.values(replaceValues),
	});
}
