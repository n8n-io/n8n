import { computed, ref, shallowRef } from 'vue';
import type { PromotionBindingConflict } from '@n8n/api-types';
import type {
	BlockedApplyResult,
	CreatedPromotionBinding,
	CreatePromotionBinding,
	MissingPromotionBinding,
} from '../promotions.types';

export function promotionBindingKey(binding: MissingPromotionBinding | CreatedPromotionBinding) {
	if (binding.kind === 'credential') return JSON.stringify([binding.kind, binding.sourceId]);
	return JSON.stringify([
		binding.kind,
		binding.name,
		binding.scope.kind,
		binding.scope.kind === 'project' ? binding.scope.project.id : null,
	]);
}

// Only a missing binding can be created here. Access is granted outside the page.
type BindingStatus = 'missing' | 'access' | 'resolved';

type PromotionBindingsError = { kind: 'creationMismatch' };

type DestructiveChange = Extract<PromotionBindingConflict, { code: 'destructive-change' }>;
type ProjectDeletion = Extract<PromotionBindingConflict, { code: 'project-deletion' }>;

const isDestructiveChange = (conflict: PromotionBindingConflict): conflict is DestructiveChange =>
	conflict.code === 'destructive-change';
const isProjectDeletion = (conflict: PromotionBindingConflict): conflict is ProjectDeletion =>
	conflict.code === 'project-deletion';
// A confirmation can't accept these, so they block the apply.
const isHardConflict = (
	conflict: PromotionBindingConflict,
): conflict is Exclude<PromotionBindingConflict, DestructiveChange | ProjectDeletion> =>
	!isDestructiveChange(conflict) && !isProjectDeletion(conflict);

function matchesCreation(binding: MissingPromotionBinding, created: CreatedPromotionBinding) {
	if (!created.id || promotionBindingKey(binding) !== promotionBindingKey(created)) return false;
	if (binding.kind === 'credential' && created.kind === 'credential') {
		return (
			created.id === binding.sourceId &&
			created.credentialType === binding.credentialType &&
			created.projectId === binding.ownerProject.id
		);
	}
	return binding.kind === 'variable' && created.kind === 'variable';
}

/**
 * The missing bindings of an Apply check, which users create from the Blockers tab. A created
 * binding stays in the table as resolved while later checks of the same commit come in.
 */
export function usePromotionBindings() {
	const originalResult = shallowRef<BlockedApplyResult>();
	const check = shallowRef<BlockedApplyResult['check']>();
	const knownBindings = shallowRef(new Map<string, MissingPromotionBinding>());
	const missingKeys = shallowRef(new Set<string>());
	// Binding key to the consumer project IDs that still need access to it.
	const accessByKey = shallowRef(new Map<string, Set<string>>());
	const isCreating = ref(false);
	const error = shallowRef<PromotionBindingsError | null>(null);
	let session = 0;

	function statusOf(key: string, projectId: string): BindingStatus {
		if (missingKeys.value.has(key)) return 'missing';
		if (accessByKey.value.get(key)?.has(projectId)) return 'access';
		return 'resolved';
	}

	/** One row for each missing binding of the session. A created binding stays as resolved. */
	const rows = computed(() =>
		Array.from(knownBindings.value, ([key, binding]) => ({
			key,
			binding,
			status: statusOf(key, binding.consumers[0].project.id),
		})),
	);

	const destructiveChanges = computed(
		() => check.value?.conflicts.filter(isDestructiveChange) ?? [],
	);
	const hardConflicts = computed(() => check.value?.conflicts.filter(isHardConflict) ?? []);
	const isBusy = computed(() => isCreating.value);

	function reconcile(result: BlockedApplyResult) {
		check.value = result.check;
		const next = new Map(knownBindings.value);
		for (const binding of result.check.missingBindings) {
			next.set(promotionBindingKey(binding), binding);
		}
		knownBindings.value = next;
		missingKeys.value = new Set(result.check.missingBindings.map(promotionBindingKey));
		accessByKey.value = new Map(
			result.check.accessRequirements.map((access) => [
				JSON.stringify([access.kind, access.sourceId]),
				new Set(access.consumers.map((consumer) => consumer.project.id)),
			]),
		);
	}

	function start(result: BlockedApplyResult) {
		session++;
		originalResult.value = result;
		knownBindings.value = new Map();
		isCreating.value = false;
		error.value = null;
		reconcile(result);
	}

	function end() {
		session++;
		originalResult.value = undefined;
	}

	async function createBinding(key: string, create: CreatePromotionBinding) {
		const binding = knownBindings.value.get(key);
		if (!originalResult.value || !binding || !missingKeys.value.has(key) || isBusy.value) return;
		const currentSession = session;
		isCreating.value = true;
		error.value = null;
		try {
			const created = await create(binding);
			if (currentSession !== session || !created) return;
			if (!matchesCreation(binding, created)) {
				error.value = { kind: 'creationMismatch' };
				return;
			}
			const next = new Set(missingKeys.value);
			next.delete(key);
			missingKeys.value = next;
		} catch {
			// The adapter reports its own failures.
		} finally {
			if (currentSession === session) isCreating.value = false;
		}
	}

	return {
		check,
		rows,
		destructiveChanges,
		hardConflicts,
		isBusy,
		error,
		start,
		reconcile,
		end,
		createBinding,
	};
}
