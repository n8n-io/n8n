import type { ComputedRef } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQueryValue } from 'vue-router';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { EXECUTIONS_SECTION_KEY } from '../constants';

export type AgentBuilderMainTab = 'agent' | 'knowledge' | 'sessions' | 'settings';

type AgentBuilderSection = 'knowledge' | typeof EXECUTIONS_SECTION_KEY | 'settings' | null;

const SECTION_QUERY_PARAM = 'section';

function getSectionFromQuery(
	section: LocationQueryValue | LocationQueryValue[] | undefined,
): AgentBuilderSection {
	const value = Array.isArray(section) ? section[0] : section;
	if (value === 'knowledge' || value === EXECUTIONS_SECTION_KEY || value === 'settings') {
		return value;
	}
	return null;
}

function getSectionFromTab(tab: AgentBuilderMainTab): AgentBuilderSection {
	if (tab === 'knowledge') return 'knowledge';
	if (tab === 'sessions') return EXECUTIONS_SECTION_KEY;
	if (tab === 'settings') return 'settings';
	return null;
}

export function useAgentBuilderMainTabs({
	executionsCount,
	knowledgeBaseEnabled,
	routeBacked = computed(() => true),
}: {
	executionsCount: ComputedRef<number>;
	knowledgeBaseEnabled: ComputedRef<boolean>;
	routeBacked?: ComputedRef<boolean>;
}) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
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
			if (selectedSection.value === 'knowledge' && knowledgeBaseEnabled.value) return 'knowledge';
			if (selectedSection.value === EXECUTIONS_SECTION_KEY) return 'sessions';
			if (selectedSection.value === 'settings') return 'settings';
			return 'agent';
		},
		set(tab) {
			void setSelectedSection(getSectionFromTab(tab));
		},
	});

	const mainTabOptions = computed(() => {
		const options: Array<{ label: string; value: AgentBuilderMainTab }> = [
			{ label: i18n.baseText('agents.builder.header.tab.agent'), value: 'agent' },
		];

		if (knowledgeBaseEnabled.value) {
			options.push({
				label: i18n.baseText('agents.builder.header.tab.knowledge' as BaseTextKey),
				value: 'knowledge',
			});
		}

		options.push(
			{
				label: i18n.baseText('agents.builder.header.tab.executions'),
				value: 'sessions',
			},
			{
				label: i18n.baseText('agents.builder.header.tab.settings' as BaseTextKey),
				value: 'settings',
			},
		);

		return options;
	});

	const executionsDescription = computed(() =>
		i18n.baseText('agents.builder.executions.count', {
			adjustToNumber: executionsCount.value,
			interpolate: { count: String(executionsCount.value) },
		}),
	);

	watch(
		() => [routeBacked.value, route.query[SECTION_QUERY_PARAM]] as const,
		([isRouteBacked, section]) => {
			if (!isRouteBacked) return;
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
