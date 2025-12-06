import path from 'node:path';

/**
 * Computes the n8n folder path based on environment variables.
 * This is used by various configs that need to know the n8n installation directory.
 */
export function getN8nFolder(): string {
	const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
	const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();
	return path.join(userHome, '.n8n');
}
