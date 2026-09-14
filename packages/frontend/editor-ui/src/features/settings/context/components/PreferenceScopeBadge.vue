<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';

import type { PreferenceProjectRef, PreferenceScopeType } from '../context.types';

const props = defineProps<{
	scopeType: PreferenceScopeType;
	project?: PreferenceProjectRef | null;
}>();

const i18n = useI18n();

const DEFAULT_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'layer-group' };

const icon = computed<IconOrEmoji | null>(() =>
	props.scopeType === 'project' ? (props.project?.icon ?? DEFAULT_PROJECT_ICON) : null,
);

const label = computed(() => {
	if (props.scopeType === 'user') return i18n.baseText('settings.context.preferences.scope.user');
	if (props.scopeType === 'instance') {
		return i18n.baseText('settings.context.preferences.scope.instance');
	}
	// A project the viewer cannot read is still listed, so fall back to a neutral label.
	return props.project?.name ?? i18n.baseText('settings.context.preferences.scope.project');
});
</script>

<template>
	<N8nBadge
		:theme="scopeType === 'user' ? 'default' : 'tertiary'"
		:class="$style.badge"
		data-test-id="preference-scope-badge"
	>
		<!--
			The badge wraps its slot in a text span, so the flex row that spaces the icon
			from the label has to live inside the slot. The variables table and the project
			card badge lay theirs out the same way.
		-->
		<span :class="$style.content">
			<N8nText v-if="icon?.type === 'emoji'" :class="$style.emoji">{{ icon.value }}</N8nText>
			<N8nIcon v-else-if="icon" :icon="icon.value" size="small" />
			<span :class="$style.label">{{ label }}</span>
		</span>
	</N8nBadge>
</template>

<style lang="scss" module>
.badge {
	max-width: 100%;
}

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.emoji {
	line-height: 1;
}
</style>
