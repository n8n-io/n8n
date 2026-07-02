import type { ComputedRef } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQueryValue } from 'vue-router';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { EXECUTIONS_SECTION_KEY } from '../constants';

export type AgentBuilderMainTab = 'agent' | 'sessions' | 'settings';

type AgentBuilderSection = typeof EXECUTIONS_SECTION_KEY | 'settings' | null;

const SECTION_QUERY_PARAM = 'section';

function getSectionFromQuery(
	section: LocationQueryValue | LocationQueryValue[] | undefined,
): AgentBuilderSection {
	const value = Array.isArray(section) ? section[0] : section;
	if (value === EXECUTIONS_SECTION_KEY || value === 'settings') {
		return value;
	}
	return null;
}

function getSectionFromTab(tab: AgentBuilderMainTab): AgentBuilderSection {
	if (tab === 'sessions') return EXECUTIONS_SECTION_KEY;
	if (tab === 'settings') return 'settings';
	return null;
}

export function useAgentBuilderMainTabs({
	executionsCount,
}: {
	executionsCount: ComputedRef<number>;
}) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const selectedSection = ref<AgentBuilderSection>(null);

	async function setSelectedSection(section: AgentBuilderSection) {
		selectedSection.value = section;
		await router.replace({
			query: { ...route.query, [SECTION_QUERY_PARAM]: section ?? undefined },
		});
	}

	const activeMainTab = computed<AgentBuilderMainTab>({
		get() {
			if (selectedSection.value === EXECUTIONS_SECTION_KEY) return 'sessions';
			if (selectedSection.value === 'settings') return 'settings';
			return 'agent';
		},
		set(tab) {
			void setSelectedSection(getSectionFromTab(tab));
		},
	});

	const mainTabOptions = computed(() => [
		{ label: i18n.baseText('agents.builder.header.tab.agent'), value: 'agent' as const },
		{
			label: i18n.baseText('agents.builder.header.tab.executions'),
			value: 'sessions' as const,
		},
		{
			label: i18n.baseText('agents.builder.header.tab.settings' as BaseTextKey),
			value: 'settings' as const,
		},
	]);

	const executionsDescription = computed(() =>
		i18n.baseText('agents.builder.executions.count', {
			adjustToNumber: executionsCount.value,
			interpolate: { count: String(executionsCount.value) },
		}),
	);

	watch(
		() => route.query[SECTION_QUERY_PARAM],
		(section) => {
			selectedSection.value = getSectionFromQuery(section);
		},
		{ immediate: true },
	);

	return {
		activeMainTab,
		mainTabOptions,
		executionsDescription,
	};
}
