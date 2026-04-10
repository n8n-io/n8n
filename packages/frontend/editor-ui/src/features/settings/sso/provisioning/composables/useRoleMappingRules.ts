import { computed, ref, watch } from 'vue';
import type {
	RoleMappingRuleResponse,
	RoleMappingRuleType,
} from '@n8n/rest-api-client/api/roleMappingRule';
import { useRoleMappingRulesApi } from './useRoleMappingRulesApi';

function generateLocalId(): string {
	return `local-${crypto.randomUUID()}`;
}

function createEmptyRule(type: RoleMappingRuleType, order: number): RoleMappingRuleResponse {
	const now = new Date().toISOString();
	return {
		id: generateLocalId(),
		expression: '',
		role: '',
		type,
		order,
		projectIds: [],
		createdAt: now,
		updatedAt: now,
	};
}

export function useRoleMappingRules() {
	const api = useRoleMappingRulesApi();

	const instanceRules = ref<RoleMappingRuleResponse[]>([]);
	const projectRules = ref<RoleMappingRuleResponse[]>([]);
	const fallbackInstanceRole = ref<string>('global:member');
	const isLoading = ref(false);
	const isDirty = ref(false);

	let serverRuleIds = new Set<string>();

	let fallbackInitialized = false;
	watch(fallbackInstanceRole, () => {
		if (fallbackInitialized) {
			isDirty.value = true;
		}
		fallbackInitialized = true;
	});

	function getRulesRef(type: RoleMappingRuleType) {
		return type === 'instance' ? instanceRules : projectRules;
	}

	function addRule(type: RoleMappingRuleType) {
		const rules = getRulesRef(type);
		const order = rules.value.length;
		rules.value.push(createEmptyRule(type, order));
		isDirty.value = true;
	}

	function updateRule(id: string, patch: Partial<RoleMappingRuleResponse>) {
		for (const rules of [instanceRules, projectRules]) {
			const index = rules.value.findIndex((r) => r.id === id);
			if (index !== -1) {
				rules.value[index] = {
					...rules.value[index],
					...patch,
					updatedAt: new Date().toISOString(),
				};
				isDirty.value = true;
				return;
			}
		}
	}

	function deleteRule(id: string) {
		for (const rules of [instanceRules, projectRules]) {
			const index = rules.value.findIndex((r) => r.id === id);
			if (index !== -1) {
				rules.value.splice(index, 1);
				rules.value.forEach((r, i) => {
					r.order = i;
				});
				isDirty.value = true;
				return;
			}
		}
	}

	async function reorder(type: RoleMappingRuleType, fromIndex: number, toIndex: number) {
		const rules = getRulesRef(type);
		const movedRule = rules.value[fromIndex];
		if (!movedRule) return;

		const [moved] = rules.value.splice(fromIndex, 1);
		rules.value.splice(toIndex, 0, moved);
		rules.value.forEach((r, i) => {
			r.order = i;
		});

		if (!movedRule.id.startsWith('local-')) {
			try {
				await api.moveRule(movedRule.id, toIndex);
			} catch {
				await loadRules();
				return;
			}
		}
		isDirty.value = true;
	}

	async function loadRules() {
		isLoading.value = true;
		try {
			const allRules = await api.listRules();
			instanceRules.value = allRules.filter((r) => r.type === 'instance');
			projectRules.value = allRules.filter((r) => r.type === 'project');
			serverRuleIds = new Set(allRules.map((r) => r.id));
			isDirty.value = false;
		} finally {
			isLoading.value = false;
		}
	}

	async function save() {
		isLoading.value = true;
		try {
			const allLocalRules = [...instanceRules.value, ...projectRules.value];
			const localRuleIds = new Set(allLocalRules.map((r) => r.id));
			const rulePayload = (r: RoleMappingRuleResponse) => ({
				expression: r.expression,
				role: r.role,
				type: r.type,
				order: r.order,
				projectIds: r.projectIds,
			});

			await Promise.all([
				...[...serverRuleIds]
					.filter((id) => !localRuleIds.has(id))
					.map(async (id) => await api.deleteRule(id)),
				...allLocalRules.map(async (rule): Promise<void> => {
					if (rule.id.startsWith('local-')) await api.createRule(rulePayload(rule));
					else if (serverRuleIds.has(rule.id)) await api.updateRule(rule.id, rulePayload(rule));
				}),
			]);

			await loadRules();
		} finally {
			isLoading.value = false;
		}
	}

	return {
		instanceRules,
		projectRules,
		fallbackInstanceRole,
		isLoading: computed(() => isLoading.value),
		isDirty: computed(() => isDirty.value),
		addRule,
		updateRule,
		deleteRule,
		reorder,
		loadRules,
		save,
	};
}
