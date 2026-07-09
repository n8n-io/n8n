<script setup lang="ts">
import {
	N8nActionDropdown,
	N8nAlertDialog,
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { LOCAL_STORAGE_SKIP_DISCONNECT_CONFIRM } from '@/app/constants/localStorage';
import CredentialIcon from './CredentialIcon.vue';

interface Props {
	credentialTypeName: string;
	credentialName: string;
	isConnected: boolean;
	canModify: boolean;
	canConnect?: boolean;
	connectedAccountName?: string;
	readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	canConnect: true,
	connectedAccountName: undefined,
	readonly: false,
});

const emit = defineEmits<{
	connect: [];
	modify: [];
	disconnect: [];
}>();

const i18n = useI18n();

const connectedActions = computed<Array<ActionDropdownItem<string>>>(() => [
	...(props.canModify
		? [
				{
					id: 'modify',
					label: i18n.baseText('credentials.private.row.modify'),
					icon: 'square-pen' as const,
				},
			]
		: []),
	{
		id: 'disconnect',
		label: i18n.baseText('credentials.private.row.disconnect'),
		icon: 'unplug' as const,
		divided: props.canModify,
	},
]);

const statusText = computed(() => {
	if (!props.isConnected) {
		return i18n.baseText('credentials.private.row.notConnected');
	}
	if (props.connectedAccountName) {
		return i18n.baseText('credentials.private.row.connectedAs', {
			interpolate: { account: props.connectedAccountName },
		});
	}
	return i18n.baseText('credentials.private.row.connectedStatus');
});

const disconnectDialogOpen = ref(false);
const skipDisconnectConfirm = ref(false);

function onActionSelect(action: string) {
	if (action === 'modify') emit('modify');
	else if (action === 'disconnect') onDisconnect();
}

function onDisconnect() {
	if (localStorage.getItem(LOCAL_STORAGE_SKIP_DISCONNECT_CONFIRM) === 'true') {
		emit('disconnect');
		return;
	}
	skipDisconnectConfirm.value = false;
	disconnectDialogOpen.value = true;
}

function onDisconnectConfirm() {
	disconnectDialogOpen.value = false;
	if (skipDisconnectConfirm.value) {
		localStorage.setItem(LOCAL_STORAGE_SKIP_DISCONNECT_CONFIRM, 'true');
	}
	emit('disconnect');
}
</script>

<template>
	<div :class="$style.row">
		<div :class="$style.left">
			<CredentialIcon :credential-type-name="credentialTypeName" :size="20" />
			<div :class="$style.textGroup">
				<span :class="$style.name">{{ credentialName }}</span>
				<span :class="$style.status">
					<N8nTooltip :disabled="!isConnected || !connectedAccountName" placement="top">
						<template #content>
							<span :class="$style.tooltipAccount">{{ statusText }}</span>
						</template>
						<span :class="$style.statusText">{{ statusText }}</span>
					</N8nTooltip>
				</span>
			</div>
		</div>

		<div :class="$style.right">
			<N8nTooltip v-if="!isConnected" :disabled="canConnect || readonly" placement="top">
				<template #content>{{
					i18n.baseText('credentials.private.row.connect.noPermission')
				}}</template>
				<N8nButton
					size="mini"
					variant="outline"
					:label="i18n.baseText('credentials.private.row.connect')"
					:disabled="readonly || !canConnect"
					data-test-id="node-credential-private-connect"
					@click="emit('connect')"
				/>
			</N8nTooltip>
			<N8nActionDropdown
				v-else
				:items="connectedActions"
				placement="bottom-end"
				:disabled="readonly"
				:extra-popper-class="$style.connectedDropdown"
				data-test-id="node-credential-private-connected-actions"
				@select="onActionSelect"
			>
				<template #activator>
					<N8nButton size="mini" variant="outline" :disabled="readonly">
						<span :class="$style.connectedBadge" />
						<span>{{ i18n.baseText('credentials.private.row.connected') }}</span>
						<N8nIcon icon="chevron-down" size="small" />
					</N8nButton>
				</template>
			</N8nActionDropdown>
		</div>

		<N8nAlertDialog
			:open="disconnectDialogOpen"
			:title="i18n.baseText('credentials.private.disconnect.dialog.title')"
			:description="
				i18n.baseText('credentials.private.disconnect.dialog.message', {
					interpolate: { credentialName },
				})
			"
			:action-label="i18n.baseText('credentials.private.disconnect.dialog.confirm')"
			action-variant="destructive"
			:cancel-label="i18n.baseText('generic.cancel')"
			data-test-id="node-credential-private-disconnect-dialog"
			@update:open="disconnectDialogOpen = $event"
			@action="onDisconnectConfirm"
		>
			<N8nCheckbox
				v-model="skipDisconnectConfirm"
				:label="i18n.baseText('credentials.private.disconnect.dialog.dontShowAgain')"
				data-test-id="node-credential-private-disconnect-dont-show-again"
			/>
		</N8nAlertDialog>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border-width, 1px) solid var(--border-color);
	border-top: none;
	border-radius: 0 0 var(--radius) var(--radius);
}

.left {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1;
}

.textGroup {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1;
}

.name {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
	white-space: nowrap;
	flex-shrink: 0;
}

.status {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--text-color--subtle);
	overflow: hidden;
	flex: 1 0 0;
	min-width: 0;
}

.statusText {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tooltipAccount {
	display: block;
	word-break: normal;
	overflow-wrap: normal;
	white-space: normal;
}

.right {
	flex-shrink: 0;
}

.connectedDropdown {
	// Border is drawn by the menu's built-in inset shadow ring
	border-radius: var(--radius);
}

.connectedDropdown [class*='separator'] {
	margin: 0;
}

.connectedDropdown [role='menuitem'] {
	gap: 0;
}

.connectedDropdown [role='menuitem'] [class*='icon'] {
	margin-right: var(--spacing--4xs);
}

.connectedDropdown [data-test-id$='-item-disconnect']:hover {
	color: var(--color--danger);
}

.connectedBadge {
	flex-shrink: 0;
	width: 9px;
	height: 9px;
	border-radius: 50%;
	background-color: var(--color--green-700);
	animation: connectedPulse var(--animation--pulse-glow--duration, 6s) infinite
		var(--animation--pulse-glow--easing, cubic-bezier(0.33, 1, 0.68, 1));

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes connectedPulse {
	0% {
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--color--green-700) 40%, transparent);
	}
	58.33% {
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--color--green-700) 0%, transparent);
	}
	66.6% {
		box-shadow: 0 0 0 7px transparent;
	}
	66.7% {
		box-shadow: 0 0 0 0 transparent;
	}
	100% {
		box-shadow: 0 0 0 0 transparent;
	}
}
</style>
