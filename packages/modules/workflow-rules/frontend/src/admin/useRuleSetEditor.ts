import type { WorkflowRuleSetResponse, WorkflowRulesScanResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	EMPTY_RULE_SET,
	getCatalogueRule,
	stricterSeverity,
	type CatalogueRuleSetting,
	type CustomRule,
	type RuleSet,
	type RuleSeverity,
} from '@n8n/workflow-rules';
import { isRecord } from '@n8n/utils/is-record';
import { computed, ref, shallowRef, toRaw } from 'vue';

import { getEffectiveRules, getRuleSet, putRuleSet, scanRules } from '../workflow-rules.api';

function clone(ruleSet: RuleSet): RuleSet {
	return structuredClone(toRaw(ruleSet));
}

function isConflict(error: unknown): boolean {
	return typeof error === 'object' && error !== null && 'httpStatusCode' in error
		? error.httpStatusCode === 409
		: false;
}

/**
 * The draft of one rule set: the instance rule set (`projectId: null`) or a project's.
 * A project draft also knows the instance rules, so it can show what it inherits and stop a
 * project from lowering a rule that the instance does not let projects relax.
 */
export function useRuleSetEditor(projectId: string | null) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();

	const loading = ref(true);
	const saving = ref(false);
	const saved = shallowRef<WorkflowRuleSetResponse | null>(null);
	const draft = ref<RuleSet>(clone(EMPTY_RULE_SET));
	const instanceRuleSet = shallowRef<RuleSet | null>(null);
	const report = shallowRef<WorkflowRulesScanResponse | null>(null);
	const reportLoading = ref(false);

	const isDirty = computed(
		() =>
			saved.value !== null && JSON.stringify(draft.value) !== JSON.stringify(saved.value.ruleSet),
	);

	async function load() {
		loading.value = true;
		try {
			const [ruleSet, effective] = await Promise.all([
				getRuleSet(rootStore.restApiContext, projectId),
				projectId ? getEffectiveRules(rootStore.restApiContext, projectId) : Promise.resolve(null),
			]);
			saved.value = ruleSet;
			draft.value = clone(ruleSet.ruleSet);
			instanceRuleSet.value = effective?.instance ?? null;
		} catch (error) {
			toast.showError(error, i18n.baseText('workflowRules.settings.loadError'));
		} finally {
			loading.value = false;
		}
	}

	function settingFor(ruleId: string): CatalogueRuleSetting | undefined {
		return draft.value.rules.find((setting) => setting.ruleId === ruleId);
	}

	function inheritedSetting(ruleId: string): CatalogueRuleSetting | undefined {
		return instanceRuleSet.value?.rules.find((setting) => setting.ruleId === ruleId);
	}

	function inheritedCustomRule(ruleId: string): CustomRule | undefined {
		return instanceRuleSet.value?.customRules.find((rule) => rule.id === ruleId);
	}

	/** The lowest severity this scope may pick for a rule. A project may not relax a locked instance rule. */
	function minimumSeverity(ruleId: string): RuleSeverity {
		if (projectId === null) return 'off';
		const inherited = inheritedSetting(ruleId) ?? inheritedCustomRule(ruleId);
		if (!inherited || inherited.adjustable) return 'off';
		return inherited.severity;
	}

	/** The severity that applies in this scope, combining the instance and the project. */
	function effectiveSeverity(ruleId: string): RuleSeverity {
		const own = settingFor(ruleId)?.severity;
		const inherited = (inheritedSetting(ruleId) ?? inheritedCustomRule(ruleId))?.severity;
		if (own === undefined) return inherited ?? 'off';
		if (inherited === undefined || minimumSeverity(ruleId) === 'off') return own;
		return stricterSeverity(own, inherited);
	}

	function upsertSetting(ruleId: string, change: Partial<CatalogueRuleSetting>) {
		const existing = settingFor(ruleId);
		if (existing) {
			Object.assign(existing, change);
			return;
		}
		const defaults = getCatalogueRule(ruleId)?.defaultOptions;
		const options = isRecord(defaults) ? { ...defaults } : undefined;
		draft.value.rules.push({ ruleId, severity: 'off', options, ...change });
	}

	function setSeverity(ruleId: string, severity: RuleSeverity) {
		upsertSetting(ruleId, { severity });
	}

	function setAdjustable(ruleId: string, adjustable: boolean) {
		upsertSetting(ruleId, { adjustable });
	}

	function setOptions(ruleId: string, options: Record<string, unknown>) {
		upsertSetting(ruleId, { options });
	}

	function saveCustomRule(rule: CustomRule) {
		const index = draft.value.customRules.findIndex((existing) => existing.id === rule.id);
		if (index === -1) draft.value.customRules.push(rule);
		else draft.value.customRules.splice(index, 1, rule);
	}

	function removeCustomRule(ruleId: string) {
		draft.value.customRules = draft.value.customRules.filter((rule) => rule.id !== ruleId);
		draft.value.rules = draft.value.rules.filter((setting) => setting.ruleId !== ruleId);
	}

	function discard() {
		if (saved.value) draft.value = clone(saved.value.ruleSet);
	}

	/** Runs the draft over existing workflows, so an admin sees what a save changes. */
	async function previewDraft() {
		return await scanRules(rootStore.restApiContext, projectId, draft.value);
	}

	async function runReport() {
		reportLoading.value = true;
		try {
			report.value = await scanRules(rootStore.restApiContext, projectId);
		} catch (error) {
			toast.showError(error, i18n.baseText('workflowRules.report.error'));
		} finally {
			reportLoading.value = false;
		}
	}

	async function save(): Promise<boolean> {
		if (!saved.value) return false;
		saving.value = true;
		try {
			saved.value = await putRuleSet(
				rootStore.restApiContext,
				projectId,
				draft.value,
				saved.value.version,
			);
			draft.value = clone(saved.value.ruleSet);
			toast.showMessage({ type: 'success', title: i18n.baseText('workflowRules.settings.saved') });
			void runReport();
			return true;
		} catch (error) {
			if (isConflict(error)) {
				toast.showError(error, i18n.baseText('workflowRules.settings.conflict'));
				await load();
			} else {
				toast.showError(error, i18n.baseText('workflowRules.settings.saveError'));
			}
			return false;
		} finally {
			saving.value = false;
		}
	}

	return {
		projectId,
		loading,
		saving,
		saved,
		draft,
		instanceRuleSet,
		report,
		reportLoading,
		isDirty,
		load,
		settingFor,
		inheritedSetting,
		inheritedCustomRule,
		minimumSeverity,
		effectiveSeverity,
		setSeverity,
		setAdjustable,
		setOptions,
		saveCustomRule,
		removeCustomRule,
		discard,
		previewDraft,
		runReport,
		save,
	};
}

export type RuleSetEditor = ReturnType<typeof useRuleSetEditor>;
