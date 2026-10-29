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

const icon = computed<IconOrEmoji>(() => {
	switch (audience.value.kind) {
		case 'project':
			return props.preference.project?.icon ?? DEFAULT_PROJECT_ICON;
		case 'user':
		case 'personalProject':
			return { type: 'icon', value: 'user' };
		case 'instance':
			return { type: 'icon', value: 'globe' };
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
</script>

<template>
	<N8nBadge variant="outline" :class="$style.badge" data-test-id="preference-scope-badge">
		<!-- The leading slot is a direct flex child of the badge, so the icon centres with the label. -->
		<template #leading>
			<N8nText v-if="icon.type === 'emoji'" :class="[$style.icon, $style.emoji]">{{
				icon.value
			}}</N8nText>
			<N8nIcon v-else :class="$style.icon" :icon="icon.value" size="small" />
		</template>
		{{ label }}
	</N8nBadge>
</template>

<style lang="scss" module>
.badge {
	max-width: 100%;

	// Geist sits high in its line box, so the inherited line height leaves the label above the
	// icon. Padding keeps descenders clear of the label's ellipsis clip.
	> :global(.n8n-text):not(.emoji) {
		line-height: 1;
		padding-block: var(--spacing--5xs);
	}
}

.icon {
	flex-shrink: 0;
}

.emoji {
	line-height: 1;
}
</style>
