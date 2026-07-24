<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nIconButton, N8nNodeIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import DefaultDetailBody from './DefaultDetailBody.vue';
import McpDetailBody from './McpDetailBody.vue';
import ToolCredentialPicker from './ToolCredentialPicker.vue';
import { resolveToolItemIcon } from './toolItemIcon';
import type { ToolConnectionItem } from './types';

const props = defineProps<{
	item: ToolConnectionItem;
	hideBackButton?: boolean;
}>();

const emit = defineEmits<{
	back: [];
	close: [];
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
	'credential-dropdown-open': [item: ToolConnectionItem];
	'first-credential-connect': [item: ToolConnectionItem];
	'new-credential-connect': [item: ToolConnectionItem];
}>();

const i18n = useI18n();

const placeholderIcon = computed(() => {
	switch (props.item.kind) {
		case 'service':
		case 'mcp-server':
			return 'plug';
		case 'workflow':
			return 'workflow';
		case 'agent':
			return 'bot';
		case 'data-store':
			return 'database';
		case 'node':
		default:
			return 'toolbox';
	}
});

const resolvedIcon = computed(() => resolveToolItemIcon(props.item));
</script>

<template>
	<div :class="$style.container" data-test-id="tools-connection-detail">
		<header :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIconButton
					v-if="!hideBackButton"
					icon="arrow-left"
					variant="ghost"
					size="medium"
					:aria-label="i18n.baseText('tools.connection.detail.back')"
					data-test-id="tools-connection-detail-back"
					@click="emit('back')"
				/>
				<div :class="$style.iconWrapper" aria-hidden="true">
					<N8nNodeIcon
						v-if="resolvedIcon"
						:type="resolvedIcon.type"
						:src="resolvedIcon.type === 'file' ? resolvedIcon.src : undefined"
						:name="resolvedIcon.type === 'icon' ? resolvedIcon.name : undefined"
						:color="resolvedIcon.type === 'icon' ? resolvedIcon.color : undefined"
						:size="20"
					/>
					<N8nIcon v-else :icon="placeholderIcon" :size="20" :class="$style.iconFallback" />
				</div>
				<N8nText :class="$style.title" tag="h2" bold>{{ item.title }}</N8nText>
			</div>
			<div :class="$style.headerActions">
				<ToolCredentialPicker
					v-if="item.credentials?.length"
					:item="item"
					:credentials="item.credentials"
					@select-credential="
						(toolItem, authType, credentialId) =>
							emit('select-credential', toolItem, authType, credentialId)
					"
					@credential-dropdown-open="emit('credential-dropdown-open', $event)"
					@first-credential-connect="emit('first-credential-connect', $event)"
					@new-credential-connect="emit('new-credential-connect', $event)"
				/>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="medium"
					:aria-label="i18n.baseText('tools.connection.action.close')"
					data-test-id="tools-connection-detail-close"
					@click="emit('close')"
				/>
			</div>
		</header>

		<slot name="body" :item="item">
			<McpDetailBody v-if="item.kind === 'mcp-server'" :item="item" />
			<DefaultDetailBody v-else :item="item" />
		</slot>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	flex: 1 1 auto;
}

.headerActions {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.iconWrapper {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.iconFallback {
	color: var(--color--text--tint-1);
}

.title {
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
