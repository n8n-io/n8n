import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch, type Ref } from 'vue';

import {
	discardApplyCredentials,
	discardCredentialDraft,
	getCredentialDrafts,
	prepareApplyCredentials,
	saveCredentialDraft,
	type CredentialDraft,
} from '../promotions.api';
import type { ApplyCheckResult, MissingPromotionBinding } from '../promotions.types';

export type BranchCredential = Extract<MissingPromotionBinding, { kind: 'credential' }>;

/**
 * Prototype. The missing credentials of an Apply come from the branch: name, expression values
 * and sharing. Users add the values that the branch lacks. The server keeps them as encrypted
 * drafts, so they survive a reload and other members of the project see them. Apply creates the
 * credentials from the branch and the drafts, and deletes them again when the Apply fails.
 */
export function usePreparedApplyCredentials(
	projectId: Ref<string | undefined>,
	check: Ref<Omit<ApplyCheckResult, 'environmentId' | 'git'> | null>,
) {
	const rootStore = useRootStore();
	// Looked up on first use: the editors are shell modals that only an edit needs.
	const editors = () => capabilityRegistry.use(capabilities.resourceEditors);

	const drafts = ref(new Map<string, CredentialDraft>());
	const error = ref<string | null>(null);

	const branchCredentials = computed((): BranchCredential[] =>
		(check.value?.missingBindings ?? []).filter(
			(binding): binding is BranchCredential => binding.kind === 'credential',
		),
	);
	const isReady = (credential: BranchCredential) =>
		credential.dataIsComplete === true || drafts.value.has(credential.sourceId);
	const pending = computed(() => branchCredentials.value.filter((c) => !isReady(c)));
	const readyIds = computed(
		() => new Set(branchCredentials.value.filter(isReady).map(({ sourceId }) => sourceId)),
	);

	async function load() {
		const id = projectId.value;
		if (id === undefined) {
			drafts.value = new Map();
			return;
		}
		try {
			const { drafts: saved } = await getCredentialDrafts(rootStore.publicApiContext, id);
			drafts.value = new Map(saved.map((draft) => [draft.sourceId, draft]));
		} catch (cause) {
			error.value = cause instanceof Error ? cause.message : String(cause);
		}
	}
	// Load again with each check: a credential that exists now drops its draft on the server.
	watch(check, load, { immediate: true });

	function addValues(credential: BranchCredential) {
		const id = projectId.value;
		if (id === undefined) return;
		const draft = drafts.value.get(credential.sourceId);
		editors().openCredentialEditor(credential.credentialType, {
			initialName: draft?.name ?? credential.name,
			initialData: { ...credential.expressionData, ...draft?.data },
			appendToBody: true,
			hideAskAssistant: true,
			usageScope: 'project',
			saveDraft: (details) => {
				const saved = { name: details.name, data: { ...details.data } };
				void saveCredentialDraft(rootStore.publicApiContext, id, credential.sourceId, saved)
					.then(load)
					.catch((cause: unknown) => {
						error.value = cause instanceof Error ? cause.message : String(cause);
					});
			},
		});
	}

	async function discardValues(credential: BranchCredential) {
		const id = projectId.value;
		if (id === undefined) return;
		await discardCredentialDraft(rootStore.publicApiContext, id, credential.sourceId);
		await load();
	}

	/**
	 * Creates the ready credentials that the Apply includes, right before it. Resolves the ids it
	 * created.
	 */
	async function create(included: (sourceId: string) => boolean): Promise<string[]> {
		const id = projectId.value;
		const ready = branchCredentials.value.filter(
			(credential) => isReady(credential) && included(credential.sourceId),
		);
		if (id === undefined || ready.length === 0) return [];
		const { credentials } = await prepareApplyCredentials(
			rootStore.publicApiContext,
			id,
			ready.map(({ sourceId }) => sourceId),
		);
		return credentials.filter(({ created }) => created).map(({ id: created }) => created);
	}

	/** The Apply did not go through: delete what {@link create} made. The drafts stay. */
	async function discard(ids: string[]) {
		const id = projectId.value;
		if (id === undefined || ids.length === 0) return;
		await discardApplyCredentials(rootStore.publicApiContext, id, ids);
	}

	return {
		branchCredentials,
		pending,
		readyIds,
		drafts,
		error,
		addValues,
		discardValues,
		create,
		discard,
	};
}
