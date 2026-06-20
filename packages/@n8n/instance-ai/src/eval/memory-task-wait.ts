export function isInstanceAiServerMemoryTaskWaitEnabled(): boolean {
	return (
		process.env.NODE_ENV !== 'production' &&
		(process.env.N8N_EVAL_WAIT_MEMORY === 'true' || process.env.E2E_TESTS === 'true')
	);
}
