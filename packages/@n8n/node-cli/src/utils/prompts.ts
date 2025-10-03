import { cancel, isCancel, log } from '@clack/prompts';

import { isN8nNodePackage } from './package';

export async function withCancelHandler<T>(prompt: Promise<symbol | T>): Promise<T> {
	const result = await prompt;
	if (isCancel(result)) return onCancel();
	return result;
}

export const onCancel = (message = 'Cancelled', code = 0) => {
	cancel(message);
	process.exit(code);
};

export async function ensureN8nPackage(commandName: string) {
	const isN8nNode = await isN8nNodePackage();
	if (!isN8nNode) {
		log.error(`Make sure you are in the root directory of your node package and your package.json contains the "n8n" field

For example:
{
	"name": "n8n-nodes-my-app",
	"version": "0.1.0",
	"n8n": {
		"nodes": ["dist/nodes/MyApp.node.js"]
	}
}
`);
		onCancel(`${commandName} can only be run in an n8n node package`, 1);
		process.exit(1);
	}
}
