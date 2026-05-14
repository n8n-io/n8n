import { ref, watch } from 'vue';

const STORAGE_KEY = 'executions.groupBySession';

function readInitial(): boolean {
	if (typeof window === 'undefined') return true;
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (raw === null) return true;
	return raw === 'true';
}

export function useGroupBySession() {
	const enabled = ref(readInitial());

	watch(
		enabled,
		(next) => {
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
			}
		},
		{ flush: 'sync' },
	);

	function setEnabled(value: boolean) {
		enabled.value = value;
	}

	return { enabled, setEnabled };
}
