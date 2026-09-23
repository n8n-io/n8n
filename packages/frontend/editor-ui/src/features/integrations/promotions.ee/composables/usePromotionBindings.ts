import { computed, ref, shallowRef } from 'vue';
import type { PromotionBindingConsumer, ContinueApplyPackageDto } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { continueApplyPromotion } from '../promotionsSettings.api';
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

// Only a missing binding can be created here. Access is granted outside the dialog.
type BindingStatus = 'missing' | 'access' | 'resolved';

type BindingRow = {
	key: string;
	binding: MissingPromotionBinding;
	status: BindingStatus;
	created?: CreatedPromotionBinding;
};

type PromotionBindingsError =
	| { kind: 'creationMismatch' }
	// The UI uses the cause to show why Continue failed.
	| { kind: 'continue'; cause: unknown };

type BindingGroup = {
	project: PromotionBindingConsumer['project'];
	workflows: Array<{
		workflow: PromotionBindingConsumer['workflows'][number];
		rows: BindingRow[];
	}>;
};

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

export function usePromotionBindings() {
	const rootStore = useRootStore();
	const originalResult = shallowRef<BlockedApplyResult>();
	const preflight = shallowRef<BlockedApplyResult['preflight']>();
	const knownBindings = shallowRef(new Map<string, MissingPromotionBinding>());
	const missingKeys = shallowRef(new Set<string>());
	// Binding key to the consumer project IDs that still need access to it.
	const accessByKey = shallowRef(new Map<string, Set<string>>());
	const createdBindings = shallowRef(new Map<string, CreatedPromotionBinding>());
	const isSubmitting = ref(false);
	const isCreating = ref(false);
	const isFinished = ref(false);
	const sourceChanged = ref(false);
	const error = shallowRef<PromotionBindingsError | null>(null);
	let session = 0;
	let expectedSource: ContinueApplyPackageDto['expectedSource'] | undefined;
	let connectionId: string | undefined;

	function statusOf(key: string, projectId: string): BindingStatus {
		if (missingKeys.value.has(key)) return 'missing';
		if (accessByKey.value.get(key)?.has(projectId)) return 'access';
		return 'resolved';
	}

	const groups = computed(() => {
		const projects = new Map<string, BindingGroup>();
		for (const [key, binding] of knownBindings.value) {
			for (const consumer of binding.consumers) {
				let group = projects.get(consumer.project.id);
				if (!group) {
					group = { project: consumer.project, workflows: [] };
					projects.set(consumer.project.id, group);
				}
				const row: BindingRow = {
					key,
					binding,
					status: statusOf(key, consumer.project.id),
					created: createdBindings.value.get(key),
				};
				for (const workflow of consumer.workflows) {
					let workflowGroup = group.workflows.find((entry) => entry.workflow.id === workflow.id);
					if (!workflowGroup) {
						workflowGroup = { workflow, rows: [] };
						group.workflows.push(workflowGroup);
					}
					if (!workflowGroup.rows.some((entry) => entry.key === row.key)) {
						workflowGroup.rows.push(row);
					}
				}
			}
		}
		return Array.from(projects.values());
	});

	const unresolvedCount = computed(
		() =>
			missingKeys.value.size + accessByKey.value.size + (preflight.value?.conflicts.length ?? 0),
	);
	const isBusy = computed(() => isSubmitting.value || isCreating.value);
	const canContinue = computed(
		() =>
			!!originalResult.value &&
			unresolvedCount.value === 0 &&
			!isBusy.value &&
			!sourceChanged.value &&
			!isFinished.value,
	);
	const savedResources = computed(() => Array.from(createdBindings.value.values()));

	function reconcile(result: BlockedApplyResult) {
		preflight.value = result.preflight;
		const next = new Map(knownBindings.value);
		for (const binding of result.preflight.missingBindings) {
			next.set(promotionBindingKey(binding), binding);
		}
		knownBindings.value = next;
		missingKeys.value = new Set(result.preflight.missingBindings.map(promotionBindingKey));
		accessByKey.value = new Map(
			result.preflight.accessRequirements.map((access) => [
				JSON.stringify([access.kind, access.sourceId]),
				new Set(access.consumers.map((consumer) => consumer.project.id)),
			]),
		);
	}

	function start(result: BlockedApplyResult) {
		session++;
		originalResult.value = result;
		connectionId = result.connectionId;
		expectedSource = { configId: result.configId, ...result.git };
		knownBindings.value = new Map();
		createdBindings.value = new Map();
		isSubmitting.value = false;
		isCreating.value = false;
		isFinished.value = false;
		sourceChanged.value = false;
		error.value = null;
		reconcile(result);
	}

	function end() {
		session++;
		originalResult.value = undefined;
	}

	async function createBinding(key: string, create: CreatePromotionBinding) {
		const binding = knownBindings.value.get(key);
		if (
			!originalResult.value ||
			!binding ||
			!missingKeys.value.has(key) ||
			isBusy.value ||
			sourceChanged.value ||
			isFinished.value
		)
			return;
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
			createdBindings.value = new Map(createdBindings.value).set(key, created);
			const next = new Set(missingKeys.value);
			next.delete(key);
			missingKeys.value = next;
		} catch {
			// The adapter reports its own failures.
		} finally {
			if (currentSession === session) isCreating.value = false;
		}
	}

	async function continueApply() {
		if (!canContinue.value || !connectionId || !expectedSource) return;
		const currentSession = session;
		isSubmitting.value = true;
		error.value = null;
		try {
			const result = await continueApplyPromotion(rootStore.publicApiContext, connectionId, {
				expectedSource: { ...expectedSource },
			});
			if (currentSession !== session) return;
			if (result.status === 'blocked') reconcile(result);
			if (result.status === 'source-changed') sourceChanged.value = true;
			if (result.status === 'applied') isFinished.value = true;
			return result;
		} catch (cause) {
			if (currentSession === session) error.value = { kind: 'continue', cause };
			return undefined;
		} finally {
			if (currentSession === session) isSubmitting.value = false;
		}
	}

	return {
		originalResult,
		preflight,
		groups,
		unresolvedCount,
		savedResources,
		isBusy,
		isSubmitting,
		isCreating,
		sourceChanged,
		error,
		canContinue,
		start,
		end,
		createBinding,
		continueApply,
	};
}
