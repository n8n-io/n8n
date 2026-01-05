<script setup lang="ts">
import { computed } from 'vue';
import { getAgentRoute } from '@/features/ai/chatHub/chat.utils';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import type { ChatModelDto } from '@n8n/api-types';
import { N8nActionDropdown, N8nIconButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { RouterLink } from 'vue-router';
import { hasPermission } from '@/app/utils/rbac/permissions';

const { agent } = defineProps<{
	agent: ChatModelDto;
}>();

const emit = defineEmits<{
	edit: [];
	delete: [];
}>();

const i18n = useI18n();

type MenuAction = 'edit' | 'delete';

const menuItems = computed<Array<ActionDropdownItem<MenuAction>>>(() => {
	return agent.model.provider === 'custom-agent'
		? [{ id: 'delete' as const, label: i18n.baseText('chatHub.agent.card.menu.delete') }]
		: [];
});

const canEdit = computed(
	() =>
		agent.model.provider === 'custom-agent' ||
		hasPermission(['rbac'], { rbac: { scope: ['workflow:read'] } }),
);

function handleSelectMenu(action: MenuAction) {
	switch (action) {
		case 'delete':
			emit('delete');
			return;
		case 'edit':
			emit('edit');
	}
}
</script>

<template>
	<RouterLink :to="getAgentRoute(agent.model)" :class="$style.card">
		<ChatAgentAvatar :agent="agent" size="lg" />

		<div :class="$style.content">
			<N8nText tag="h3" size="medium" bold :class="$style.title">
				{{ agent.name }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.description">
				{{ agent.description || i18n.baseText('chatHub.agent.card.noDescription') }}
			</N8nText>
		</div>

		<div :class="$style.actions">
			<N8nIconButton
				v-if="canEdit"
				icon="pen"
				type="tertiary"
				size="medium"
				:title="i18n.baseText('chatHub.agent.card.button.edit')"
				@click.prevent="emit('edit')"
			/>
			<N8nActionDropdown
				v-if="menuItems.length > 0"
				:items="menuItems"
				placement="bottom-end"
				@select="handleSelectMenu"
				@click.stop.prevent
			>
				<template #activator>
					<N8nIconButton
						icon="ellipsis-vertical"
						type="tertiary"
						size="medium"
						:title="i18n.baseText('chatHub.agent.card.button.moreOptions')"
						text
						:class="$style.actionDropdownTrigger"
					/>
				</template>
			</N8nActionDropdown>
		</div>
	</RouterLink>
</template>

<style lang="scss" module>
.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	text-decoration: none;
	color: inherit;
	transition: box-shadow 0.3s ease;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.avatar {
	flex-shrink: 0;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.badge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.actionDropdownTrigger {
	box-shadow: none !important;
	outline: none !important;
}
</style>
