import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';

const activeOwner = ref<symbol | null>(null);

export function useExclusiveOpen(wantsOpen: Ref<boolean>): ComputedRef<boolean> {
	const owner = Symbol('exclusive-open');

	const release = () => {
		if (activeOwner.value === owner) activeOwner.value = null;
	};

	watch(
		wantsOpen,
		(wants) => {
			if (wants) activeOwner.value = owner;
			else release();
		},
		{ immediate: true },
	);
	onScopeDispose(release);

	return computed(() => wantsOpen.value && activeOwner.value === owner);
}
