import { copyFile } from 'fs/promises';
import type { ReplaceInFileConfig } from 'replace-in-file';
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
	replaceValues: object,
): Promise<void> {
	// Copy the file to then replace the values in it

	await copyFile(sourceFilePath, destinationFilePath);

	// Replace the variables in the template file
	const options: ReplaceInFileConfig = {
		files: [destinationFilePath],
		from: [],
		to: [],
	};
	options.from = Object.keys(replaceValues).map((key) => {
		return new RegExp(key, 'g');
	});
	options.to = Object.values(replaceValues);
	await replaceInFile(options);
}
