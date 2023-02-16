import { n8nPosthogHooks_LOGGING_ENABLED } from '@/hooks/constants';

export function hooksPosthogLog(
	name: string,
	{ isMethod } = { isMethod: false },
	loggingEnabled = n8nPosthogHooks_LOGGING_ENABLED,
) {
	if (!loggingEnabled) return;

	if (isMethod) {
		console.log(`Method fired: ${name}`);
		return;
	}

	console.log(`Hook fired: ${name}`);
}
