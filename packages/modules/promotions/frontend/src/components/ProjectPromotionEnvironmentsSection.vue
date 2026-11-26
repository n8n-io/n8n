<script setup lang="ts">
import type {
	ProjectPromotionEnvironment,
	ProjectPromotionEnvironmentsResponse,
	PromotionDirection,
} from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { N8nIcon, N8nSettingsRow, N8nSettingsRowGroup, N8nText } from '@n8n/design-system';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { getProjectPromotionEnvironments } from '../promotions.api';
import { promotionDirectionIcon, promotionProviderIcon } from '../promotionsSettings.utils';

const props = defineProps<{ projectId: string }>();

const DIRECTIONS: PromotionDirection[] = ['promote', 'apply'];

const i18n = useI18n();
const rootStore = useRootStore();
const environmentsSettings = capabilityRegistry.tryUse(capabilities.environmentsSettings);
const isEnabled = computed(() => environmentsSettings?.isPromotionsEnabled() ?? false);
const { next } = useLatestFetch();

const response = ref<ProjectPromotionEnvironmentsResponse>();

const rows = computed(() => {
	const environments = response.value;
	if (!environments?.enabled) return [];
	return DIRECTIONS.map((direction) => {
		const environment = environments[direction];
		return {
			direction,
			title: i18n.baseText(`settings.promotions.environments.${direction}.title`),
			description: describeEnvironment(environment),
			icon:
				environment.state === 'default'
					? promotionProviderIcon[environment.providerType]
					: promotionDirectionIcon[direction],
		};
	});
});

watch(
	[() => props.projectId, isEnabled],
	async ([projectId, enabled]) => {
		response.value = undefined;
		const isLatest = next();
		if (!enabled) return;
		try {
			const loaded = await getProjectPromotionEnvironments(rootStore.restApiContext, projectId);
			if (isLatest()) response.value = loaded;
		} catch {
			// The section only informs, so a failed load hides it.
		}
	},
	{ immediate: true },
);

function describeEnvironment(environment: ProjectPromotionEnvironment) {
	if (environment.state === 'own') {
		return i18n.baseText('projects.settings.promotionEnvironments.own');
	}
	if (environment.state === 'none') {
		return i18n.baseText('projects.settings.promotionEnvironments.none');
	}
	return i18n.baseText('projects.settings.promotionEnvironments.default', {
		interpolate: {
			name: environment.name,
			type: i18n.baseText(`settings.promotions.providers.type.${environment.providerType}`),
		},
	});
}
</script>

<template>
	<div
		v-if="rows.length > 0"
		:class="$style.section"
		data-test-id="project-promotion-environments-section"
	>
		<h3>{{ i18n.baseText('projects.settings.promotionEnvironments.title') }}</h3>
		<N8nText tag="p" size="small" color="text-light" :class="$style.description">
			{{ i18n.baseText('projects.settings.promotionEnvironments.description') }}
		</N8nText>
		<N8nSettingsRowGroup>
			<N8nSettingsRow
				v-for="row in rows"
				:key="row.direction"
				:title="row.title"
				:description="row.description"
				show-visual
				:data-test-id="`project-promotion-environment-${row.direction}`"
			>
				<template #visual>
					<N8nIcon :icon="row.icon" color="text-dark" size="xlarge" />
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
	</div>
</template>

<style lang="scss" module>
.section {
	padding-bottom: var(--spacing--xl);

	h3 {
		margin-bottom: var(--spacing--xs);
		font-size: var(--font-size--lg);
	}
}

.description {
	margin-bottom: var(--spacing--xs);
}
</style>
