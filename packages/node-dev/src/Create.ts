import * as fs from 'fs';
import { replaceInFile, ReplaceInFileConfig } from 'replace-in-file';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const { promisify } = require('util');

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const fsCopyFile = promisify(fs.copyFile);

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
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	await fsCopyFile(sourceFilePath, destinationFilePath);

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
