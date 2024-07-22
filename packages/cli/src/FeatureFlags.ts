import fs from 'fs/promises';

export async function isPartialExecutionEnabled() {
	try {
		await fs.access('new-partial-execution');
		return true;
	} catch (error) {
		return false;
	}
}
