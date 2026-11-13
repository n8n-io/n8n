<script setup lang="ts">
import { computed } from 'vue';
import type { SkillSourceListItem } from '@n8n/api-types';
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	source: Pick<SkillSourceListItem, 'health' | 'lastCheckedAt'>;
}>();
const i18n = useI18n();
const variant = computed(() => {
	if (props.source.health === 'connected') return 'outline';
	return props.source.health === 'delayed' ? 'warning' : 'danger';
});
const lastCheck = computed(() =>
	props.source.lastCheckedAt
		? i18n.baseText('settings.context.skills.sources.health.lastChecked', {
				interpolate: {
					time: new Date(props.source.lastCheckedAt).toLocaleString(i18n.locale, {
						dateStyle: 'medium',
						timeStyle: 'short',
					}),
				},
			})
		: i18n.baseText('settings.context.skills.sources.health.neverChecked'),
);
const details = computed(() =>
	[
		props.source.health !== 'connected'
			? i18n.baseText(`settings.context.skills.sources.health.${props.source.health}.description`)
			: null,
		lastCheck.value,
		i18n.baseText('settings.context.skills.sources.health.schedule'),
	]
		.filter(Boolean)
		.join('\n'),
);
</script>

<template>
	<N8nTooltip as-child>
		<button type="button" :class="$style.trigger" data-test-id="skill-source-health" @click.stop>
			<N8nBadge :variant="variant">
				{{ i18n.baseText(`settings.context.skills.sources.health.${source.health}`) }}
			</N8nBadge>
		</button>
		<template #content>
			<span :class="$style.details">{{ details }}</span>
		</template>
	</N8nTooltip>
</template>

<style lang="scss" module>
.trigger {
	display: inline-flex;
	padding: 0;
	border: none;
	border-radius: var(--radius--sm);
	background: none;
	cursor: help;
}

.details {
	white-space: pre-line;
}
</style>
