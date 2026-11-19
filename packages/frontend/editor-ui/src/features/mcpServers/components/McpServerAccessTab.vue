<script lang="ts" setup>
import type {
	McpServerAccessMode,
	McpServerApiKeyDto,
	McpServerDetailDto,
	McpServerOAuthConnectionDto,
	UpdateMcpServerDto,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nText,
	N8nTimeAgo,
	useMessage,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';

import { useMcpServersStore } from '../mcpServers.store';
import { formatDate, formatNumber } from '../mcpServers.utils';
import McpServerApiKeyDialog from './McpServerApiKeyDialog.vue';

const props = defineProps<{ server: McpServerDetailDto }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const store = useMcpServersStore();

const apiKeyDialogOpen = ref(false);
const rateLimit = ref(String(props.server.rateLimitPerMinute));

watch(
	() => props.server.rateLimitPerMinute,
	(value) => (rateLimit.value = String(value)),
);

interface AccessOption {
	mode: McpServerAccessMode | 'idp';
	icon: IconName;
	title: string;
	description: string;
	soon?: boolean;
}

const accessOptions = computed<AccessOption[]>(() => [
	{
		mode: 'public',
		icon: 'globe',
		title: i18n.baseText('mcpServers.access.mode.public'),
		description: i18n.baseText('mcpServers.access.mode.public.description'),
	},
	{
		mode: 'apiKey',
		icon: 'key-round',
		title: i18n.baseText('mcpServers.access.mode.apiKey'),
		description: i18n.baseText('mcpServers.access.mode.apiKey.description'),
	},
	{
		mode: 'oauth',
		icon: 'lock',
		title: i18n.baseText('mcpServers.access.mode.oauth'),
		description: i18n.baseText('mcpServers.access.mode.oauth.description'),
	},
	{
		mode: 'idp',
		icon: 'shield-user',
		title: i18n.baseText('mcpServers.access.mode.idp'),
		description: i18n.baseText('mcpServers.access.mode.idp.description'),
		soon: true,
	},
]);

const riskyToolCount = computed(
	() => props.server.tools.filter((tool) => tool.enabled && tool.behavior !== 'read').length,
);

async function patch(body: UpdateMcpServerDto) {
	try {
		await store.updateServer(props.server.id, body);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.saveError'));
	}
}

function onSelectMode(option: AccessOption) {
	if (option.soon || option.mode === 'idp' || option.mode === props.server.accessMode) return;
	void patch({ accessMode: option.mode });
}

function onRateLimitBlur() {
	const value = Number.parseInt(rateLimit.value, 10);
	if (!Number.isFinite(value) || value < 0) {
		rateLimit.value = String(props.server.rateLimitPerMinute);
		return;
	}
	if (value === props.server.rateLimitPerMinute) return;
	void patch({ rateLimitPerMinute: value });
}

function onShareVisibility(value: string | undefined) {
	if (value !== 'instance' && value !== 'public') return;
	void patch({ shareVisibility: value });
}

async function onRevokeKey(key: McpServerApiKeyDto) {
	const choice = await message.confirm(
		i18n.baseText('mcpServers.apiKey.revoke.message', { interpolate: { label: key.label } }),
		i18n.baseText('mcpServers.apiKey.revoke.title'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('mcpServers.apiKey.revoke.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (choice !== MODAL_CONFIRM) return;
	try {
		await store.revokeApiKey(props.server.id, key.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.apiKey.revoke.error'));
	}
}

async function onToggleOAuthUser(connection: McpServerOAuthConnectionDto) {
	try {
		await store.setOAuthUserRevoked(props.server.id, connection.userId, !connection.revoked);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.saveError'));
	}
}
</script>

<template>
	<div :class="$style.access" data-testid="mcp-server-access-tab">
		<section :class="$style.section">
			<N8nHeading tag="h3" size="small" bold>
				{{ i18n.baseText('mcpServers.access.who.title') }}
			</N8nHeading>
			<div :class="$style.options" role="radiogroup">
				<button
					v-for="option in accessOptions"
					:key="option.mode"
					type="button"
					role="radio"
					:aria-checked="server.accessMode === option.mode"
					:disabled="option.soon"
					:class="[
						$style.option,
						{
							[$style.optionActive]: server.accessMode === option.mode,
							[$style.optionSoon]: option.soon,
						},
					]"
					:data-testid="`mcp-server-access-${option.mode}`"
					@click="onSelectMode(option)"
				>
					<span :class="$style.optionTitle">
						<N8nIcon :icon="option.icon" size="small" />
						<N8nText bold>{{ option.title }}</N8nText>
						<N8nBadge v-if="option.soon" variant="subtle" size="xsmall">
							{{ i18n.baseText('mcpServers.comingSoon') }}
						</N8nBadge>
					</span>
					<N8nText size="small" color="text-light">{{ option.description }}</N8nText>
				</button>
			</div>
			<N8nCallout
				v-if="server.accessMode === 'public' && riskyToolCount > 0"
				theme="warning"
				icon="triangle-alert"
				data-testid="mcp-server-public-warning"
			>
				{{
					i18n.baseText('mcpServers.access.publicWarning', {
						adjustToNumber: riskyToolCount,
						interpolate: { count: riskyToolCount },
					})
				}}
			</N8nCallout>
		</section>

		<section v-if="server.accessMode === 'apiKey'" :class="$style.section">
			<header :class="$style.sectionHeader">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.apiKey.title') }}
				</N8nHeading>
				<span :class="$style.spacer" />
				<N8nButton
					variant="outline"
					size="small"
					icon="plus"
					data-testid="mcp-server-api-key-new"
					@click="apiKeyDialogOpen = true"
				>
					{{ i18n.baseText('mcpServers.apiKey.new') }}
				</N8nButton>
			</header>
			<table v-if="server.apiKeys.length" :class="$style.table">
				<thead>
					<tr>
						<th>{{ i18n.baseText('mcpServers.apiKey.column.label') }}</th>
						<th>{{ i18n.baseText('mcpServers.apiKey.column.key') }}</th>
						<th>{{ i18n.baseText('mcpServers.apiKey.column.calls') }}</th>
						<th>{{ i18n.baseText('mcpServers.apiKey.column.lastUsed') }}</th>
						<th />
					</tr>
				</thead>
				<tbody>
					<tr v-for="key in server.apiKeys" :key="key.id" data-testid="mcp-server-api-key-row">
						<td>{{ key.label }}</td>
						<td :class="$style.mono">mcp_••••{{ key.keyHint }}</td>
						<td>{{ formatNumber(key.calls7d) }}</td>
						<td>
							<N8nTimeAgo v-if="key.lastUsedAt" :date="key.lastUsedAt" />
							<N8nText v-else size="small" color="text-light">
								{{ i18n.baseText('mcpServers.never') }}
							</N8nText>
						</td>
						<td :class="$style.actionCell">
							<N8nButton
								variant="ghost"
								size="mini"
								:class="$style.danger"
								data-testid="mcp-server-api-key-revoke"
								@click="onRevokeKey(key)"
							>
								{{ i18n.baseText('mcpServers.revoke') }}
							</N8nButton>
						</td>
					</tr>
				</tbody>
			</table>
			<N8nText v-else size="small" color="text-light">
				{{ i18n.baseText('mcpServers.apiKey.empty') }}
			</N8nText>
		</section>

		<section v-if="server.accessMode === 'oauth'" :class="$style.section">
			<header :class="$style.sectionHeader">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.oauth.title') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('mcpServers.oauth.subtitle') }}
				</N8nText>
			</header>
			<table v-if="server.oauthConnections.length" :class="$style.table">
				<thead>
					<tr>
						<th>{{ i18n.baseText('mcpServers.oauth.column.person') }}</th>
						<th>{{ i18n.baseText('mcpServers.oauth.column.client') }}</th>
						<th>{{ i18n.baseText('mcpServers.oauth.column.firstUsed') }}</th>
						<th>{{ i18n.baseText('mcpServers.oauth.column.lastUsed') }}</th>
						<th />
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="connection in server.oauthConnections"
						:key="`${connection.userId}:${connection.clientName}`"
						:class="{ [$style.revoked]: connection.revoked }"
						data-testid="mcp-server-oauth-row"
					>
						<td>
							<div :class="$style.person">
								<N8nText size="small" bold>{{
									connection.userName || connection.userEmail
								}}</N8nText>
								<N8nText v-if="connection.userName" size="xsmall" color="text-light">
									{{ connection.userEmail }}
								</N8nText>
							</div>
						</td>
						<td>{{ connection.clientName }}</td>
						<td>{{ formatDate(connection.firstUsedAt) }}</td>
						<td><N8nTimeAgo :date="connection.lastUsedAt" /></td>
						<td :class="$style.actionCell">
							<N8nBadge v-if="connection.revoked" variant="danger" size="xsmall">
								{{ i18n.baseText('mcpServers.oauth.revoked') }}
							</N8nBadge>
							<N8nButton
								variant="ghost"
								size="mini"
								:class="{ [$style.danger]: !connection.revoked }"
								data-testid="mcp-server-oauth-toggle"
								@click="onToggleOAuthUser(connection)"
							>
								{{ i18n.baseText(connection.revoked ? 'mcpServers.restore' : 'mcpServers.revoke') }}
							</N8nButton>
						</td>
					</tr>
				</tbody>
			</table>
			<N8nText v-else size="small" color="text-light">
				{{ i18n.baseText('mcpServers.oauth.empty') }}
			</N8nText>
		</section>

		<div :class="$style.columns">
			<section :class="$style.section">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.access.rateLimit.title') }}
				</N8nHeading>
				<div :class="$style.rateLimit">
					<N8nInput
						v-model="rateLimit"
						type="number"
						:min="0"
						size="medium"
						:class="$style.rateInput"
						data-testid="mcp-server-rate-limit"
						@blur="onRateLimitBlur"
					/>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('mcpServers.access.rateLimit.hint') }}
					</N8nText>
				</div>
			</section>

			<section :class="$style.section">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.access.share.title') }}
				</N8nHeading>
				<N8nRadioGroup
					:model-value="server.shareVisibility"
					data-testid="mcp-server-share-visibility"
					@update:model-value="onShareVisibility"
				>
					<N8nRadioGroupItem
						value="instance"
						:label="i18n.baseText('mcpServers.access.share.instance')"
					/>
					<N8nRadioGroupItem
						value="public"
						:label="i18n.baseText('mcpServers.access.share.public')"
					/>
				</N8nRadioGroup>
			</section>
		</div>

		<section :class="$style.section">
			<N8nHeading tag="h3" size="small" bold>
				{{ i18n.baseText('mcpServers.access.safety.title') }}
			</N8nHeading>
			<N8nCheckbox
				:model-value="server.confirmDestructive"
				:label="i18n.baseText('mcpServers.access.safety.confirmDestructive')"
				data-testid="mcp-server-confirm-destructive"
				@update:model-value="(value: boolean) => patch({ confirmDestructive: value })"
			/>
			<N8nCheckbox
				:model-value="server.confirmWrite"
				:label="i18n.baseText('mcpServers.access.safety.confirmWrite')"
				data-testid="mcp-server-confirm-write"
				@update:model-value="(value: boolean) => patch({ confirmWrite: value })"
			/>
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h3" size="small" bold>
				{{ i18n.baseText('mcpServers.access.insights.title') }}
			</N8nHeading>
			<N8nCheckbox
				:model-value="server.captureIntent"
				:label="i18n.baseText('mcpServers.access.insights.captureIntent')"
				data-testid="mcp-server-capture-intent"
				@update:model-value="(value: boolean) => patch({ captureIntent: value })"
			/>
			<N8nCheckbox
				:model-value="server.missingCapabilityTool"
				:label="i18n.baseText('mcpServers.access.insights.missingCapabilityTool')"
				data-testid="mcp-server-missing-capability-tool"
				@update:model-value="(value: boolean) => patch({ missingCapabilityTool: value })"
			/>
		</section>

		<McpServerApiKeyDialog
			v-if="apiKeyDialogOpen"
			:server-id="server.id"
			@close="apiKeyDialogOpen = false"
		/>
	</div>
</template>

<style lang="scss" module>
.access {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.spacer {
	flex: 1;
}

.options {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: var(--spacing--xs);
}

.option {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--text-color);
	text-align: left;
	cursor: pointer;
	font: inherit;

	&:hover:not(:disabled) {
		border-color: var(--border-color--hover);
	}
}

.optionActive {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 1px var(--color--primary);
}

.optionSoon {
	border-style: dashed;
	cursor: not-allowed;
	opacity: 0.6;
}

.optionTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);

	// A long title wraps; the icon and the badge keep their size.
	> :first-child,
	> :last-child {
		flex-shrink: 0;
	}

	> :last-child:not(:nth-child(2)) {
		margin-left: auto;
	}
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--sm);

	th {
		text-align: left;
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		color: var(--text-color--subtle);
		padding: var(--spacing--3xs) var(--spacing--xs);
		border-bottom: var(--border);
	}

	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: var(--border);
		vertical-align: middle;
	}
}

.mono {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.actionCell {
	text-align: right;
	white-space: nowrap;
}

.danger {
	color: var(--text-color--danger);
}

.revoked td {
	color: var(--text-color--subtler);
}

.person {
	display: flex;
	flex-direction: column;
}

.columns {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: var(--spacing--xl);
}

.rateLimit {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.rateInput {
	width: 120px;
	flex-shrink: 0;
}
</style>
