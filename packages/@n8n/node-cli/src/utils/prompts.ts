import { cancel, isCancel } from '@clack/prompts';

export async function withCancelHandler<T>(prompt: Promise<symbol | T>): Promise<T> {
	const result = await prompt;
	if (isCancel(result)) return onCancel();
	return result;
}

export const onCancel = (message = 'Cancelled', code = 0) => {
	cancel(message);
	process.exit(code);
};
