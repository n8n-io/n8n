<script setup lang="ts">
import { computed, inject } from 'vue';
import { N8nButton, N8nIcon, N8nNodeIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ToolCredentialPicker from './ToolCredentialPicker.vue';
import { TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, type ToolConnectionItem } from './types';
import { resolveToolItemIcon } from './toolItemIcon';

const props = defineProps<{
	item: ToolConnectionItem;
}>();

const emit = defineEmits<{
	'open-detail': [item: ToolConnectionItem];
	connect: [item: ToolConnectionItem];
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
	'credential-dropdown-open': [item: ToolConnectionItem];
	'first-credential-connect': [item: ToolConnectionItem];
	'new-credential-connect': [item: ToolConnectionItem];
}>();

const i18n = useI18n();
const credentialAdapter = inject(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, null);

const shouldShowCredentialPicker = computed(() => {
	if (props.item.isConnected) {
		return true;
	}

	return Boolean(
		props.item.credentials?.some(
			({ authType }) => (credentialAdapter?.getCredentialsByType(authType).length ?? 0) > 0,
		),
	);
});

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

function handleRowClick() {
	emit('open-detail', props.item);
}

function handleConnect() {
	emit('connect', props.item);
	if (props.item.credentials?.length) {
		emit('first-credential-connect', props.item);
	}
}
</script>

<template>
	<div
		:class="[$style.row, $style[`row--${item.kind}`]]"
		:data-test-id="`tools-connection-row`"
		:data-row-kind="item.kind"
	>
		<button
			type="button"
			:class="$style.mainAction"
			data-test-id="tools-connection-row-main"
			@click="handleRowClick"
		>
			<template v-if="item.kind === 'workflow'">
				<span :class="$style.workflowIcon" aria-hidden="true">
					<N8nIcon icon="workflow" :size="20" />
				</span>
				<N8nText :class="$style.workflowTitle" tag="span" bold>{{ item.title }}</N8nText>
			</template>

			<template v-else>
				<span :class="$style.iconWrapper" aria-hidden="true">
					<N8nNodeIcon
						v-if="resolvedIcon"
						:type="resolvedIcon.type"
						:src="resolvedIcon.type === 'file' ? resolvedIcon.src : undefined"
						:name="resolvedIcon.type === 'icon' ? resolvedIcon.name : undefined"
						:color="resolvedIcon.type === 'icon' ? resolvedIcon.color : undefined"
						:size="20"
					/>
					<N8nIcon v-else :icon="placeholderIcon" :size="20" :class="$style.iconFallback" />
				</span>
				<span :class="$style.text">
					<N8nText :class="$style.title" tag="span" bold>{{ item.title }}</N8nText>
					<N8nText
						v-if="item.description"
						:class="$style.description"
						tag="span"
						size="small"
						color="text-light"
					>
						{{ item.description }}
					</N8nText>
				</span>
			</template>
		</button>

		<div :class="$style.action">
			<ToolCredentialPicker
				v-if="shouldShowCredentialPicker"
				:item="item"
				:credentials="item.credentials ?? []"
				connect-variant="outline"
				@select-credential="
					(toolItem, authType, credentialId) =>
						emit('select-credential', toolItem, authType, credentialId)
				"
				@credential-dropdown-open="emit('credential-dropdown-open', $event)"
				@first-credential-connect="emit('first-credential-connect', $event)"
				@new-credential-connect="emit('new-credential-connect', $event)"
			/>
			<template v-else>
				<N8nButton
					:label="i18n.baseText('tools.connection.action.connect')"
					variant="outline"
					size="small"
					data-test-id="tools-connection-row-connect"
					@click="handleConnect"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--2xs);
	min-height: 58px;
	border-radius: var(--radius--2xs);
	transition: background-color 120ms ease;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.mainAction {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex: 1 1 0;
	min-width: 0;
	align-self: stretch;
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
	}
}

.row--workflow {
	min-height: 48px;
}

.iconWrapper {
	flex-shrink: 0;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: var(--color--background--light-2);
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.iconFallback {
	color: var(--color--text--tint-1);
}

.workflowIcon {
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--primary);
}

.text {
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.workflowTitle {
	flex: 1 1 0;
	min-width: 0;
	font-weight: var(--font-weight--medium);
}

.title {
	font-weight: var(--font-weight--medium);
}

.description {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.action {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
