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
	N8nPopover,
	N8nSelect2,
	N8nUserSelect,
	type SelectValue,
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
	last7: i18n.baseText('settings.mcp.oAuthClients.filters.connected.lastXDays', {
		interpolate: { count: 7 },
	}),
	last30: i18n.baseText('settings.mcp.oAuthClients.filters.connected.lastXDays', {
		interpolate: { count: 30 },
	}),
	older: i18n.baseText('settings.mcp.oAuthClients.filters.connected.older'),
};

// The search input lives outside the popover, so it doesn't count as a filter.
const filtersLength = computed(() => {
	const { type, ownerId, connected } = props.modelValue;
	return [type, ownerId, connected].filter((value) => value !== null).length;
});

const hasFilters = computed(() => filtersLength.value > 0);

// Select items need a non-empty value, so `all` stands in for "no filter".
const ALL_FILTER = 'all';

const clientTypeItems = computed(() => [
	{
		value: ALL_FILTER,
		label: i18n.baseText('settings.mcp.oAuthClients.filters.clientType.all'),
	},
	...CLIENT_TYPE_OPTIONS.map((type) => ({
		value: type,
		label: i18n.baseText(`settings.mcp.oAuthClients.filters.clientType.${type}` as BaseTextKey),
	})),
]);

const connectedItems = computed(() => [
	{
		value: ALL_FILTER,
		label: i18n.baseText('settings.mcp.oAuthClients.filters.connected.allTime'),
	},
	...CONNECTED_OPTIONS.map((period) => ({
		value: period,
		label: connectedOptionLabels[period],
	})),
]);

function setKeyValue(key: keyof OAuthClientFilters, value: string) {
	emit('update:modelValue', { ...props.modelValue, [key]: value === '' ? null : value });
}

function onFilterChange(key: keyof OAuthClientFilters, value: SelectValue | undefined) {
	setKeyValue(key, typeof value === 'string' && value !== ALL_FILTER ? value : '');
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
						variant="primary"
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
				<N8nSelect2
					:model-value="modelValue.type ?? ALL_FILTER"
					:items="clientTypeItems"
					size="medium"
					data-test-id="mcp-clients-filter-type"
					@update:model-value="onFilterChange('type', $event)"
				/>

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
				<N8nSelect2
					:model-value="modelValue.connected ?? ALL_FILTER"
					:items="connectedItems"
					size="medium"
					data-test-id="mcp-clients-filter-connected"
					@update:model-value="onFilterChange('connected', $event)"
				/>

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
