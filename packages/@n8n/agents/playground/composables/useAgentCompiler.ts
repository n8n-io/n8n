export function useAgentCompiler() {
	const status = ref<'idle' | 'compiling' | 'active' | 'error'>('idle');
	const error = ref<string | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function compile(source: string) {
		if (!source.trim()) {
			status.value = 'idle';
			error.value = null;
			return;
		}

		status.value = 'compiling';
		error.value = null;

		try {
			const response = await $fetch<{ ok: boolean; error?: string }>('/api/agent/compile', {
				method: 'POST',
				body: { source },
			});

			if (response.ok) {
				status.value = 'active';
				error.value = null;
			} else {
				status.value = 'error';
				error.value = response.error ?? 'Unknown compilation error';
			}
		} catch (e) {
			status.value = 'error';
			error.value = e instanceof Error ? e.message : 'Failed to compile';
		}
	}

	function compileDebounced(source: string, delay = 500) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => compile(source), delay);
	}

	return { status, error, compile, compileDebounced };
}
