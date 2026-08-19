<script setup lang="ts">
import { computed, inject } from 'vue';
import { N8nButton, N8nIcon, N8nSpinner, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ShieldIcon from 'virtual:icons/fa-solid/shield-alt';
import ToolCredentialPicker from './ToolCredentialPicker.vue';
import ToolIcon from './ToolIcon.vue';
import {
	hasToolConnection,
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type ToolConnectionItem,
} from './types';
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

/**
 * The picker needs both credential definitions and an injected adapter.
 * Consumers that manage credentials elsewhere simply get the static marker below.
 */
const shouldShowCredentialPicker = computed(() => {
	if (!credentialAdapter || !props.item.credentials?.length) return false;
	if (props.item.status === 'connecting') return false;
	if (hasToolConnection(props.item.status)) return true;

	return Boolean(
		props.item.credentials?.some(
			({ authType }) => credentialAdapter.getCredentialsByType(authType).length > 0,
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

const actionLabel = computed(() =>
	props.item.communityPreview
		? i18n.baseText('communityNodeDetails.install')
		: i18n.baseText(
				props.item.status === 'disconnected'
					? 'tools.connection.action.reconnect'
					: 'tools.connection.action.connect',
			),
);

const installBlocked = computed(
	() => Boolean(props.item.communityPreview) && Boolean(props.item.installDisabled),
);

const isDisabled = computed(() => Boolean(props.item.disabled));

/**
 * For most rows the button only repeated what clicking the row already does.
 * What survives is the pair that goes somewhere the row body cannot: installing
 * a community package, and connecting an MCP server without a detour through
 * its detail view.
 */
const hasDirectAction = computed(
	() => Boolean(props.item.communityPreview) || props.item.kind === 'mcp-server',
);

function handleRowClick() {
	if (props.item.disabled) return;
	if (props.item.status === 'connecting') return;
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
		:class="[$style.row, $style[`row--${item.kind}`], { [$style.rowDisabled]: isDisabled }]"
		:data-test-id="`tools-connection-row`"
		:data-row-kind="item.kind"
	>
		<button
			type="button"
			:class="$style.mainAction"
			:disabled="isDisabled || item.status === 'connecting'"
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
				<ToolIcon :source="resolvedIcon" :fallback-icon="placeholderIcon" />
				<span :class="$style.text">
					<span :class="$style.titleRow">
						<N8nText :class="$style.title" tag="span" bold>{{ item.title }}</N8nText>
						<N8nTooltip
							v-if="item.verified"
							:content="i18n.baseText('communityNodeInfo.approved')"
							placement="top"
						>
							<ShieldIcon
								:class="$style.verifiedIcon"
								role="img"
								:aria-label="i18n.baseText('communityNodeInfo.approved')"
								data-test-id="tools-connection-row-verified-badge"
							/>
						</N8nTooltip>
					</span>
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
			<N8nTooltip
				v-if="isDisabled"
				:content="item.disabledReason ?? ''"
				:disabled="!item.disabledReason"
				placement="top"
			>
				<span
					:class="$style.disabledMarker"
					role="img"
					tabindex="0"
					:aria-label="item.disabledReason"
					data-test-id="tools-connection-row-disabled"
				>
					<N8nIcon icon="info" :size="14" color="text-light" />
				</span>
			</N8nTooltip>
			<ToolCredentialPicker
				v-else-if="shouldShowCredentialPicker"
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
			<span
				v-else-if="item.status === 'connected'"
				:class="$style.statusMarker"
				data-test-id="tools-connection-row-connected"
			>
				<span :class="$style.statusDot" aria-hidden="true" />
				{{ i18n.baseText('tools.connection.action.connected') }}
			</span>
			<span
				v-else-if="item.status === 'connecting'"
				:class="$style.statusMarker"
				data-test-id="tools-connection-row-connecting"
			>
				<N8nSpinner size="small" />
				{{ i18n.baseText('tools.connection.action.connecting') }}
			</span>
			<template v-else-if="hasDirectAction">
				<N8nTooltip
					v-if="installBlocked && !item.installing"
					:content="i18n.baseText('tools.connection.install.contactAdmin')"
					placement="top"
				>
					<span>
						<N8nButton
							:label="actionLabel"
							variant="outline"
							size="small"
							disabled
							data-test-id="tools-connection-row-install"
						/>
					</span>
				</N8nTooltip>
				<N8nButton
					v-else
					variant="outline"
					size="small"
					:loading="item.installing"
					:data-test-id="
						item.communityPreview ? 'tools-connection-row-install' : 'tools-connection-row-connect'
					"
					@click="handleConnect"
				>
					<span
						v-if="!item.communityPreview && item.status === 'disconnected'"
						:class="[$style.statusDot, $style.statusDotDisconnected]"
						aria-hidden="true"
					/>
					{{ actionLabel }}
				</N8nButton>
			</template>
			<N8nButton
				v-else-if="item.status === 'disconnected'"
				variant="outline"
				size="small"
				data-test-id="tools-connection-row-disconnected"
				@click="handleRowClick"
			>
				<span :class="[$style.statusDot, $style.statusDotDisconnected]" aria-hidden="true" />
				{{ i18n.baseText('tools.connection.action.reconnect') }}
			</N8nButton>
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
		background: var(--color--background--light-1);
	}
}

.rowDisabled {
	opacity: 0.6;

	&:hover {
		background: transparent;
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

	&:disabled {
		cursor: not-allowed;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
	}
}

.row--workflow {
	min-height: 48px;
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

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.title {
	font-weight: var(--font-weight--medium);
}

.verifiedIcon {
	flex-shrink: 0;
	width: 12px;
	height: 12px;
	color: var(--color--success);
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

// Status only, for consumers that manage credentials elsewhere. Matches the
// credential picker's connected pill minus the chevron and button semantics.
.statusMarker {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color--success);
	flex-shrink: 0;
}

.disabledMarker {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-2);
}

.statusDotDisconnected {
	background: var(--color--danger);
}
</style>
