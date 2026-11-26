import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef } from 'vue';

import { fetchCredentialTypeInfo, policedType, type CredentialTypeInfo } from './credentialTypes';
import { effectiveAccess, projectRulesFor, type EffectiveAccess } from './effectiveAccess';
import {
	fetchInstancePolicy,
	fetchProjectPolicy,
	fetchRules,
	saveProjectPolicy,
	type RequestFedPolicy,
	type RuntimeCredentialRule,
} from '../../runtime-credentials.api';
import { getHttpStatus } from '../../runtime-credentials.utils';

export type ProjectInputRow = {
	credentialType: string;
	displayName: string;
	/** The instance rules that feed this credential type. */
	rules: RuntimeCredentialRule[];
	effective: EffectiveAccess;
};

export type LoadFailure = 'forbidden' | 'generic';
export type SaveFailure = 'conflict' | 'generic';

/** Loads what the project page needs and writes the project policy for one credential type. */
export function useProjectRuntimeInputs(getProjectId: () => string) {
	const rootStore = useRootStore();

	const rules = ref<RuntimeCredentialRule[]>([]);
	const instancePolicy = ref<RequestFedPolicy | null>(null);
	const projectPolicy = ref<RequestFedPolicy | null>(null);
	const typeInfo = shallowRef(new Map<string, CredentialTypeInfo>());

	// True from the start, so the page never flashes the empty state before the first read.
	const loading = ref(true);
	const loadFailure = ref<LoadFailure | null>(null);
	/** True when the user cannot read the instance policy. Instance blocks still apply at run time. */
	const instanceUnavailable = ref(false);
	const savingType = ref<string | null>(null);
	const saveFailure = ref<SaveFailure | null>(null);

	async function load() {
		loading.value = true;
		loadFailure.value = null;
		saveFailure.value = null;
		const context = rootStore.restApiContext;
		const [rulesResult, instanceResult, projectResult, typesResult] = await Promise.allSettled([
			fetchRules(context),
			fetchInstancePolicy(context),
			fetchProjectPolicy(context, getProjectId()),
			fetchCredentialTypeInfo(rootStore.baseUrl),
		]);

		if (rulesResult.status === 'rejected') {
			loadFailure.value = getHttpStatus(rulesResult.reason) === 403 ? 'forbidden' : 'generic';
		} else if (projectResult.status === 'rejected') {
			loadFailure.value = 'generic';
		} else {
			rules.value = rulesResult.value;
			projectPolicy.value = projectResult.value;
		}

		instanceUnavailable.value = instanceResult.status === 'rejected';
		instancePolicy.value = instanceResult.status === 'fulfilled' ? instanceResult.value : null;
		if (typesResult.status === 'fulfilled') typeInfo.value = typesResult.value;
		loading.value = false;
	}

	const rows = computed<ProjectInputRow[]>(() => {
		const project = projectPolicy.value;
		if (!project) return [];

		const byType = new Map<string, RuntimeCredentialRule[]>();
		for (const rule of rules.value) {
			byType.set(rule.credentialType, [...(byType.get(rule.credentialType) ?? []), rule]);
		}

		return [...byType]
			.map(([credentialType, feeding]) => ({
				credentialType,
				displayName: typeInfo.value.get(credentialType)?.displayName ?? credentialType,
				rules: feeding,
				effective: effectiveAccess(
					instancePolicy.value,
					project,
					policedType(typeInfo.value, credentialType),
				),
			}))
			.sort((a, b) => a.displayName.localeCompare(b.displayName));
	});

	/** Saves the project policy with the version that this page last read. */
	async function setAccess(credentialType: string, desired: 'allow' | 'deny'): Promise<boolean> {
		const current = projectPolicy.value;
		if (!current || savingType.value) return false;

		savingType.value = credentialType;
		saveFailure.value = null;
		try {
			projectPolicy.value = await saveProjectPolicy(rootStore.restApiContext, getProjectId(), {
				...current,
				rules: projectRulesFor(
					instancePolicy.value,
					current,
					policedType(typeInfo.value, credentialType),
					desired,
					() => globalThis.crypto.randomUUID(),
				),
			});
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
		instanceUnavailable,
		savingType,
		saveFailure,
		load,
		setAccess,
	};
}
