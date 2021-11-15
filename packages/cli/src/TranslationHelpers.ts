import { join, dirname } from 'path';

/**
 * Retrieve the path to the translation file for a node.
 */
export function getTranslationPath(nodeSourcePath: string, language: string): string {
	return join(dirname(nodeSourcePath), 'translations', `${language}.js`);
}
