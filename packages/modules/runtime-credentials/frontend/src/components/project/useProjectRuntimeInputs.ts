import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef } from 'vue';

import { fetchCredentialTypeNames } from './credentialTypes';
import {
	fetchProjectPolicy,
	fetchProjectRules,
	saveProjectPolicy,
	type PolicyRule,
	type ProjectRuntimeCredentialRule,
	type RequestFedPolicy,
} from '../../runtime-credentials.api';
import { getHttpStatus } from '../../runtime-credentials.utils';

export type ProjectInputRow = {
	credentialType: string;
	displayName: string;
	/** The rules that feed this credential type. */
	rules: ProjectRuntimeCredentialRule[];
	access: 'allow' | 'deny';
	/** The policy scope that blocks the type. `null` when the type is allowed. */
	blockedBy: 'instance' | 'project' | null;
};

export type LoadFailure = 'forbidden' | 'generic';
export type SaveFailure = 'conflict' | 'generic';

/**
 * The project policy after a change of access for one type. It drops the rules that name the type
 * and puts one explicit rule first. First match wins, so that rule decides, even when a broader
 * rule or a default action says otherwise. An explicit allow also lets the project opt in when
 * the instance delegates the decision.
 */
export function projectRulesFor(
	rules: readonly PolicyRule[],
	credentialType: string,
	desired: 'allow' | 'deny',
	newId: () => string,
): PolicyRule[] {
	const kept = rules.filter(
		(rule) => !(rule.selector.kind === 'name' && rule.selector.value === credentialType),
	);
	return [
		{ id: newId(), action: desired, selector: { kind: 'name', value: credentialType } },
		...kept,
	];
}

/** Loads what the project page needs and writes the project policy for one credential type. */
export function useProjectRuntimeInputs(getProjectId: () => string) {
	const rootStore = useRootStore();

	const rules = ref<ProjectRuntimeCredentialRule[]>([]);
	const projectPolicy = ref<RequestFedPolicy | null>(null);
	const typeNames = shallowRef(new Map<string, string>());

	// True from the start, so the page never flashes the empty state before the first read.
	const loading = ref(true);
	const loadFailure = ref<LoadFailure | null>(null);
	const savingType = ref<string | null>(null);
	const saveFailure = ref<SaveFailure | null>(null);

	async function load() {
		loading.value = true;
		loadFailure.value = null;
		saveFailure.value = null;
		const context = rootStore.restApiContext;
		const [rulesResult, policyResult, typesResult] = await Promise.allSettled([
			fetchProjectRules(context, getProjectId()),
			fetchProjectPolicy(context, getProjectId()),
			fetchCredentialTypeNames(rootStore.baseUrl),
		]);

		const failed = [rulesResult, policyResult].find((result) => result.status === 'rejected');
		if (failed) {
			loadFailure.value = getHttpStatus(failed.reason) === 403 ? 'forbidden' : 'generic';
		} else if (rulesResult.status === 'fulfilled' && policyResult.status === 'fulfilled') {
			rules.value = rulesResult.value;
			projectPolicy.value = policyResult.value;
		}

		if (typesResult.status === 'fulfilled') typeNames.value = typesResult.value;
		loading.value = false;
	}

	const rows = computed<ProjectInputRow[]>(() => {
		const byType = new Map<string, ProjectRuntimeCredentialRule[]>();
		for (const rule of rules.value) {
			byType.set(rule.credentialType, [...(byType.get(rule.credentialType) ?? []), rule]);
		}

		return [...byType]
			.map(([credentialType, feeding]) => ({
				credentialType,
				displayName: typeNames.value.get(credentialType) ?? credentialType,
				rules: feeding,
				// The server gives every rule of a type the same access.
				access: feeding[0].access === 'allowed' ? ('allow' as const) : ('deny' as const),
				blockedBy: feeding[0].blockedBy,
			}))
			.sort((a, b) => a.displayName.localeCompare(b.displayName));
	});

	/** Saves the project policy with the version that this page last read, then reads the rules again. */
	async function setAccess(credentialType: string, desired: 'allow' | 'deny'): Promise<boolean> {
		const current = projectPolicy.value;
		if (!current || savingType.value) return false;

		savingType.value = credentialType;
		saveFailure.value = null;
		try {
			projectPolicy.value = await saveProjectPolicy(rootStore.restApiContext, getProjectId(), {
				...current,
				rules: projectRulesFor(current.rules, credentialType, desired, () =>
					globalThis.crypto.randomUUID(),
				),
			});
			rules.value = await fetchProjectRules(rootStore.restApiContext, getProjectId());
			return true;
		} catch (error) {
			saveFailure.value = getHttpStatus(error) === 409 ? 'conflict' : 'generic';
			return false;
		} finally {
			savingType.value = null;
		}
	}

	return {
		rules,
		rows,
		loading,
		loadFailure,
		savingType,
		saveFailure,
		load,
		setAccess,
	};
}
