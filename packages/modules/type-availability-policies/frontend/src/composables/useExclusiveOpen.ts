import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';

const activeOwner = ref<symbol | null>(null);

export function useExclusiveOpen(wantsOpen: Ref<boolean>): {
	open: ComputedRef<boolean>;
	claim: () => void;
} {
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

	/** Takes the slot back for a fresh intent that `wantsOpen` cannot show, because it is already true. */
	const claim = () => {
		if (wantsOpen.value) activeOwner.value = owner;
	};

	return { open: computed(() => wantsOpen.value && activeOwner.value === owner), claim };
}
