import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, watch, type Ref } from 'vue';

import {
	discardApplyCredentials,
	prepareApplyCredentials,
	type PreparedApplyCredential,
} from '../promotions.api';
import type { ApplyCheckResult } from '../promotions.types';

/**
 * Prototype. Creates the missing credentials of an Apply from the branch as soon as the check
 * names them, with their sharing and expression values. The user then only adds the secret
 * values. An Apply that does not finish deletes the credentials again.
 */
export function usePreparedApplyCredentials(
	projectId: Ref<string | undefined>,
	check: Ref<Omit<ApplyCheckResult, 'environmentId' | 'git'> | null>,
	refresh: () => Promise<void>,
) {
	const rootStore = useRootStore();
	// Looked up on first use: the editors are shell modals that only an edit needs.
	const editors = () => capabilityRegistry.use(capabilities.resourceEditors);

	const prepared = shallowRef<PreparedApplyCredential[]>([]);
	const completed = ref(new Set<string>());
	const isPreparing = ref(false);
	const error = ref<string | null>(null);
	/** The credential whose editor is open, so its close marks the values as added. */
	const editing = ref<string | null>(null);
	let kept = false;

	const pendingValues = computed(() =>
		prepared.value.filter(
			({ id, created, needsValues }) => created && needsValues && !completed.value.has(id),
		),
	);
	const createdIds = computed(() =>
		prepared.value.filter(({ created }) => created).map(({ id }) => id),
	);

	async function prepare(ids: string[]) {
		const id = projectId.value;
		const known = new Set(prepared.value.map((credential) => credential.id));
		const fresh = ids.filter((credentialId) => !known.has(credentialId));
		if (id === undefined || fresh.length === 0 || isPreparing.value) return;
		isPreparing.value = true;
		error.value = null;
		try {
			const { credentials } = await prepareApplyCredentials(rootStore.publicApiContext, id, fresh);
			prepared.value = [...prepared.value, ...credentials];
			kept = false;
			await refresh();
		} catch (cause) {
			error.value = cause instanceof Error ? cause.message : String(cause);
		} finally {
			isPreparing.value = false;
		}
	}

	// The check lists a branch credential that this instance lacks: create it from the branch.
	watch(
		check,
		async (current) => {
			const ids = (current?.missingBindings ?? []).flatMap((binding) =>
				binding.kind === 'credential' ? binding.sourceId : [],
			);
			await prepare(ids);
		},
		{ immediate: true },
	);

	function addValues(credentialId: string) {
		editing.value = credentialId;
		editors().openExistingCredentialEditor(credentialId);
	}

	// Prototype: closing the editor counts as adding the values.
	watch(
		() => editing.value !== null && editors().isEditorOpen('credential'),
		(open, wasOpen) => {
			if (open || !wasOpen || editing.value === null) return;
			completed.value = new Set([...completed.value, editing.value]);
			editing.value = null;
		},
	);

	/** The Apply finished, so the credentials stay. */
	function keep() {
		kept = true;
	}

	/** The Apply did not finish: delete what this page created. */
	async function discard() {
		const id = projectId.value;
		const ids = createdIds.value;
		if (kept || id === undefined || ids.length === 0) return;
		prepared.value = [];
		completed.value = new Set();
		await discardApplyCredentials(rootStore.publicApiContext, id, ids);
	}

	return {
		prepared,
		pendingValues,
		isPreparing,
		error,
		addValues,
		keep,
		discard,
	};
}
