import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, type Ref } from 'vue';

import { discardApplyCredentials, prepareApplyCredentials } from '../promotions.api';
import type { ApplyCheckResult, MissingPromotionBinding } from '../promotions.types';

export type BranchCredential = Extract<MissingPromotionBinding, { kind: 'credential' }>;

type Draft = { name: string; data: Record<string, unknown> };

/**
 * Prototype. The missing credentials of an Apply come from the branch: name, expression values
 * and sharing. The user adds only the values that the branch lacks. The values stay in this page
 * until the user applies. Apply then creates the credentials first, and deletes them again when
 * the Apply does not go through.
 */
export function usePreparedApplyCredentials(
	projectId: Ref<string | undefined>,
	check: Ref<Omit<ApplyCheckResult, 'environmentId' | 'git'> | null>,
) {
	const rootStore = useRootStore();
	// Looked up on first use: the editors are shell modals that only an edit needs.
	const editors = () => capabilityRegistry.use(capabilities.resourceEditors);

	const drafts = ref(new Map<string, Draft>());

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

	function addValues(credential: BranchCredential) {
		const draft = drafts.value.get(credential.sourceId);
		editors().openCredentialEditor(credential.credentialType, {
			initialName: draft?.name ?? credential.name,
			initialData: { ...credential.expressionData, ...draft?.data },
			appendToBody: true,
			hideAskAssistant: true,
			usageScope: 'project',
			saveDraft: (details) => {
				const next = new Map(drafts.value);
				next.set(credential.sourceId, { name: details.name, data: { ...details.data } });
				drafts.value = next;
			},
		});
	}

	/** Creates the ready credentials right before the Apply. Resolves the ids it created. */
	async function create(): Promise<string[]> {
		const id = projectId.value;
		const ready = branchCredentials.value.filter(isReady);
		if (id === undefined || ready.length === 0) return [];
		const { credentials } = await prepareApplyCredentials(
			rootStore.publicApiContext,
			id,
			ready.map(({ sourceId }) => {
				const draft = drafts.value.get(sourceId);
				return { id: sourceId, ...(draft ? { name: draft.name, data: draft.data } : {}) };
			}),
		);
		return credentials.filter(({ created }) => created).map(({ id: created }) => created);
	}

	/** The Apply did not go through: delete what {@link create} made. The drafts stay. */
	async function discard(ids: string[]) {
		const id = projectId.value;
		if (id === undefined || ids.length === 0) return;
		await discardApplyCredentials(rootStore.publicApiContext, id, ids);
	}

	return { branchCredentials, pending, readyIds, drafts, addValues, create, discard };
}
