import type { ComputedRef } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQueryValue } from 'vue-router';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useAgentEvalsFlag } from '@/features/ai/evaluation.ee/composables/useAgentEvalsFlag';
import { EXECUTIONS_SECTION_KEY } from '../constants';

export type AgentBuilderMainTab = 'agent' | 'knowledge' | 'sessions' | 'settings' | 'evals';

type AgentBuilderSection =
	| 'knowledge'
	| typeof EXECUTIONS_SECTION_KEY
	| 'settings'
	| 'evals'
	| null;

const SECTION_QUERY_PARAM = 'section';

function getSectionFromQuery(
	section: LocationQueryValue | LocationQueryValue[] | undefined,
	isEvalsEnabled: boolean,
): AgentBuilderSection {
	const value = Array.isArray(section) ? section[0] : section;
	if (value === 'knowledge' || value === EXECUTIONS_SECTION_KEY || value === 'settings') {
		return value;
	}
	// A deep link to the evals surface falls back to the default tab while the
	// flag is off, rather than selecting a tab that isn't in the row.
	if (value === 'evals' && isEvalsEnabled) return 'evals';
	return null;
}

function getSectionFromTab(tab: AgentBuilderMainTab): AgentBuilderSection {
	if (tab === 'knowledge') return 'knowledge';
	if (tab === 'sessions') return EXECUTIONS_SECTION_KEY;
	if (tab === 'settings') return 'settings';
	if (tab === 'evals') return 'evals';
	return null;
}

export function useAgentBuilderMainTabs({
	executionsCount,
	routeBacked = computed(() => true),
}: {
	executionsCount: ComputedRef<number>;
	routeBacked?: ComputedRef<boolean>;
}) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const isEvalsEnabled = useAgentEvalsFlag();
	const selectedSection = ref<AgentBuilderSection>(null);

	async function setSelectedSection(section: AgentBuilderSection) {
		selectedSection.value = section;
		if (!routeBacked.value) return;
		await router.replace({
			query: { ...route.query, [SECTION_QUERY_PARAM]: section ?? undefined },
		});
	}

	const activeMainTab = computed<AgentBuilderMainTab>({
		get() {
			if (selectedSection.value === 'knowledge') return 'knowledge';
			if (selectedSection.value === EXECUTIONS_SECTION_KEY) return 'sessions';
			if (selectedSection.value === 'settings') return 'settings';
			if (selectedSection.value === 'evals') return 'evals';
			return 'agent';
		},
		set(tab) {
			void setSelectedSection(getSectionFromTab(tab));
		},
	});

	const mainTabOptions = computed<Array<{ label: string; value: AgentBuilderMainTab }>>(() => [
		{ label: i18n.baseText('agents.builder.header.tab.agent'), value: 'agent' },
		{
			label: i18n.baseText('agents.builder.header.tab.knowledge' as BaseTextKey),
			value: 'knowledge',
		},
		{ label: i18n.baseText('agents.builder.header.tab.executions'), value: 'sessions' },
		{
			label: i18n.baseText('agents.builder.header.tab.settings' as BaseTextKey),
			value: 'settings',
		},
		// Absent rather than disabled while the flag is off — a disabled tab
		// advertises a surface the user has no way to reach.
		...(isEvalsEnabled.value
			? [
					{
						label: i18n.baseText('agents.builder.header.tab.agentEvals'),
						value: 'evals' as const,
					},
				]
			: []),
	]);

	const executionsDescription = computed(() =>
		i18n.baseText('agents.builder.executions.count', {
			adjustToNumber: executionsCount.value,
			interpolate: { count: String(executionsCount.value) },
		}),
	);

	// The flag is a watch source, not just read inside: PostHog resolves after the
	// first frame, so a `?section=evals` deep link has to be re-derived once the
	// flag arrives or it would stay collapsed to the default tab.
	watch(
		() => [routeBacked.value, route.query[SECTION_QUERY_PARAM], isEvalsEnabled.value] as const,
		([isRouteBacked, section, evalsEnabled]) => {
			if (!isRouteBacked) return;
			selectedSection.value = getSectionFromQuery(section, evalsEnabled);
		},
		{ immediate: true },
	);

	return {
		activeMainTab,
		mainTabOptions,
		executionsDescription,
	};
}
