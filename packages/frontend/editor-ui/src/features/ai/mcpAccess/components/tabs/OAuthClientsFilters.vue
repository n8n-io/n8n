<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { IUser } from '@n8n/design-system';
import {
	N8nBadge,
	N8nButton,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nPopover,
	N8nSelect,
	N8nUserSelect,
} from '@n8n/design-system';

import type { McpClientConnectedPeriod, McpClientTypeFilter } from '@n8n/api-types';
import { MCP_CLIENT_CONNECTED_PERIODS, MCP_CLIENT_TYPE_FILTERS } from '@n8n/api-types';

import type { OAuthClientFilters } from '../../clients.utils';

const props = defineProps<{
	modelValue: OAuthClientFilters;
	/** Consent owners offered by the "Connected by" select (All tab only). */
	owners?: IUser[];
	showOwnerFilter?: boolean;
	currentUserId?: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: OAuthClientFilters];
}>();

const i18n = useI18n();

const CLIENT_TYPE_OPTIONS: readonly McpClientTypeFilter[] = MCP_CLIENT_TYPE_FILTERS;
const CONNECTED_OPTIONS: readonly McpClientConnectedPeriod[] = MCP_CLIENT_CONNECTED_PERIODS;

const connectedOptionLabels: Record<McpClientConnectedPeriod, string> = {
	last7: i18n.baseText('settings.mcp.oAuthClients.filters.connected.last7Days'),
	last30: i18n.baseText('settings.mcp.oAuthClients.filters.connected.last30Days'),
	older: i18n.baseText('settings.mcp.oAuthClients.filters.connected.older'),
};

// The search input lives outside the popover, so it doesn't count as a filter.
const filtersLength = computed(() => {
	const { type, ownerId, connected } = props.modelValue;
	return [type, ownerId, connected].filter((value) => value !== null).length;
});

const hasFilters = computed(() => filtersLength.value > 0);

// Selects can't carry null values, so '' stands in for "no filter".
function setKeyValue(key: keyof OAuthClientFilters, value: string) {
	emit('update:modelValue', { ...props.modelValue, [key]: value === '' ? null : value });
}

function resetFilters() {
	emit('update:modelValue', { ...props.modelValue, type: null, ownerId: null, connected: null });
}
</script>

<template>
	<N8nPopover width="304px" :content-class="$style['popover-content']" align="end">
		<template #trigger>
			<span :class="$style['trigger-wrapper']">
				<N8nButton
					variant="outline"
					icon="funnel"
					size="medium"
					:icon-only="!hasFilters"
					:active="hasFilters"
					:aria-label="i18n.baseText('forms.resourceFiltersDropdown.filters')"
					data-test-id="mcp-clients-filters-trigger"
				>
					<N8nBadge
						v-if="hasFilters"
						:class="$style['filter-button-count']"
						data-test-id="mcp-clients-filters-count"
						theme="primary"
					>
						{{ filtersLength }}
					</N8nBadge>
					<span v-if="hasFilters">
						{{ i18n.baseText('forms.resourceFiltersDropdown.filters') }}
					</span>
				</N8nButton>
			</span>
		</template>
		<template #content>
			<div :class="$style['filters-dropdown']" data-test-id="mcp-clients-filters-dropdown">
				<N8nInputLabel
					:label="i18n.baseText('settings.mcp.oAuthClients.filters.clientType')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<N8nSelect
					:model-value="modelValue.type ?? ''"
					size="medium"
					data-test-id="mcp-clients-filter-type"
					@update:model-value="setKeyValue('type', $event)"
				>
					<N8nOption
						value=""
						:label="i18n.baseText('settings.mcp.oAuthClients.filters.clientType.all')"
					/>
					<N8nOption
						v-for="type in CLIENT_TYPE_OPTIONS"
						:key="type"
						:value="type"
						:label="
							i18n.baseText(`settings.mcp.oAuthClients.filters.clientType.${type}` as BaseTextKey)
						"
					/>
				</N8nSelect>

				<template v-if="showOwnerFilter">
					<N8nInputLabel
						:label="i18n.baseText('settings.mcp.oAuthClients.filters.connectedBy')"
						:bold="false"
						size="small"
						color="text-base"
						class="mt-s mb-3xs"
					/>
					<N8nUserSelect
						:users="owners ?? []"
						:model-value="modelValue.ownerId ?? ''"
						:current-user-id="currentUserId"
						:placeholder="i18n.baseText('settings.mcp.oAuthClients.filters.connectedBy.all')"
						size="medium"
						clearable
						data-test-id="mcp-clients-filter-owner"
						@update:model-value="setKeyValue('ownerId', $event ?? '')"
					/>
				</template>

				<N8nInputLabel
					:label="i18n.baseText('settings.mcp.oAuthClients.filters.connected')"
					:bold="false"
					size="small"
					color="text-base"
					class="mt-s mb-3xs"
				/>
				<N8nSelect
					:model-value="modelValue.connected ?? ''"
					size="medium"
					data-test-id="mcp-clients-filter-connected"
					@update:model-value="setKeyValue('connected', $event)"
				>
					<N8nOption
						value=""
						:label="i18n.baseText('settings.mcp.oAuthClients.filters.connected.allTime')"
					/>
					<N8nOption
						v-for="period in CONNECTED_OPTIONS"
						:key="period"
						:value="period"
						:label="connectedOptionLabels[period]"
					/>
				</N8nSelect>

				<div v-if="hasFilters" :class="[$style['filters-dropdown-footer'], 'mt-s']">
					<N8nLink data-test-id="mcp-clients-filters-reset" @click="resetFilters">
						{{ i18n.baseText('forms.resourceFiltersDropdown.reset') }}
					</N8nLink>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover-content {
	padding: var(--spacing--sm);
}

.trigger-wrapper {
	display: inline-flex;

	&[data-state='open'] button {
		background-color: var(--button--color--background-active);
	}
}

.filter-button-count > span {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--semibold);
}

.filters-dropdown-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
</style>
