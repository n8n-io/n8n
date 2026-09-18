<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useUsersStore } from '@n8n/stores/users.store';

import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';

import type { Preference } from '../context.types';
import { preferenceAudience, preferenceUserName } from '../context.utils';

const props = defineProps<{
	preference: Preference;
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const audience = computed(() => preferenceAudience(props.preference, usersStore.currentUser?.id));

const icon = computed<IconOrEmoji | null>(() => {
	switch (audience.value.kind) {
		case 'project':
			return props.preference.project?.icon ?? DEFAULT_PROJECT_ICON;
		case 'personalProject':
			return { type: 'icon', value: 'user' };
		default:
			return null;
	}
});

const label = computed(() => {
	const scope = audience.value;
	switch (scope.kind) {
		case 'instance':
			return i18n.baseText('settings.context.preferences.scope.instance');
		case 'user':
			return scope.own
				? i18n.baseText('settings.context.preferences.scope.user')
				: i18n.baseText('settings.context.preferences.scope.otherUser', {
						interpolate: { name: preferenceUserName(scope.user) },
					});
		case 'personalProject':
			return scope.own
				? i18n.baseText('settings.context.preferences.scope.personalProject')
				: i18n.baseText('settings.context.preferences.scope.otherPersonalProject', {
						interpolate: { name: scope.ownerName },
					});
		case 'project':
			// A project the viewer cannot read is still listed, so fall back to a neutral label.
			return scope.name ?? i18n.baseText('settings.context.preferences.scope.project');
	}
});

const theme = computed(() =>
	audience.value.kind === 'user' || audience.value.kind === 'personalProject'
		? 'default'
		: 'tertiary',
);
</script>

<template>
	<N8nBadge :theme="theme" :class="$style.badge" data-test-id="preference-scope-badge">
		<!-- The badge wraps its slot in a text span, so the flex row has to live inside the slot. -->
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
