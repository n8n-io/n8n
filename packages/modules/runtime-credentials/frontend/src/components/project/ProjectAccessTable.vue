<script setup lang="ts">
import {
	N8nButton,
	N8nDataTableServer,
	N8nDropdownMenu,
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
	type IconName,
	type TableHeader,
	type TableOptions,
	type TextColor,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { computed, ref } from 'vue';

import type { ProjectInputRow } from './useProjectRuntimeInputs';
import type { RuntimeCredentialRule } from '../../runtime-credentials.api';

type Access = 'allow' | 'deny';

const SEARCH_THRESHOLD = 8;

const props = defineProps<{
	rows: ProjectInputRow[];
	/** The credential type that is saving. Its trigger shows a spinner. */
	savingType: string | null;
}>();

const emit = defineEmits<{
	change: [credentialType: string, access: Access, displayName: string];
}>();

const i18n = useI18n();
// The shell draws the icon, so the module needs no icon logic of its own.
const CredentialTypeIcon = computed(() => componentRegistry.get('credential-type-icon'));

const ACCESS_LABEL_KEY: Record<Access, BaseTextKey> = {
	allow: 'runtimeCredentials.project.access.allow',
	deny: 'runtimeCredentials.project.access.deny',
};

const ACCESS_ICON: Record<Access, { icon: IconName; color: TextColor }> = {
	allow: { icon: 'check', color: 'success' },
	deny: { icon: 'lock', color: 'danger' },
};

const MENU_ITEMS = (['allow', 'deny'] as const).map((access) => ({
	access,
	label: i18n.baseText(ACCESS_LABEL_KEY[access]),
}));

function menuItems(current: Access): Array<DropdownMenuItemProps<Access>> {
	return MENU_ITEMS.map(({ access, label }) => ({
		id: access,
		label,
		checked: access === current,
	}));
}

const accessMenuItems: Record<Access, Array<DropdownMenuItemProps<Access>>> = {
	allow: menuItems('allow'),
	deny: menuItems('deny'),
};

const search = ref('');
const sortBy = ref<TableOptions['sortBy']>([{ id: 'displayName', desc: false }]);

const headers = computed<Array<TableHeader<ProjectInputRow>>>(() => [
	{
		title: i18n.baseText('runtimeCredentials.project.table.credentialType'),
		key: 'displayName',
		minWidth: 200,
	},
	{
		title: i18n.baseText('runtimeCredentials.project.table.rules'),
		key: 'rules',
		minWidth: 240,
		disableSort: true,
	},
	{
		title: i18n.baseText('runtimeCredentials.project.table.access'),
		key: 'access',
		value: (row: ProjectInputRow) => row.effective.access,
		width: 190,
	},
]);

const collator = new Intl.Collator();

const sortedRows = computed(() => {
	const [sort] = sortBy.value;
	const direction = sort?.desc ? -1 : 1;
	const byName = (a: ProjectInputRow, b: ProjectInputRow) =>
		collator.compare(a.displayName, b.displayName);
	return [...props.rows].sort((a, b) =>
		sort?.id === 'access'
			? direction * collator.compare(a.effective.access, b.effective.access) || byName(a, b)
			: direction * byName(a, b),
	);
});

const showSearch = computed(() => props.rows.length > SEARCH_THRESHOLD);

const filteredRows = computed(() => {
	const query = search.value.trim().toLowerCase();
	if (!query) return sortedRows.value;
	return sortedRows.value.filter(
		(row) =>
			row.displayName.toLowerCase().includes(query) ||
			row.credentialType.toLowerCase().includes(query) ||
			row.rules.some((rule) => rule.alias.toLowerCase().includes(query)),
	);
});

const noMatch = computed(() => props.rows.length > 0 && filteredRows.value.length === 0);

function triggerOf(rule: RuntimeCredentialRule): string {
	return rule.nodeType === '*'
		? i18n.baseText('runtimeCredentials.project.table.rule.anyTrigger')
		: rule.nodeType;
}

function ruleContext(rule: RuntimeCredentialRule): string {
	return i18n.baseText('runtimeCredentials.project.table.rule.trigger', {
		interpolate: { path: rule.path, nodeType: triggerOf(rule) },
	});
}

/** The project can change a row unless the instance blocks the type outright. */
function isEditable(row: ProjectInputRow): boolean {
	return row.effective.deniedBy !== 'instance' || row.effective.canOptIn;
}

function tooltipOf(row: ProjectInputRow): string | undefined {
	const { effective } = row;
	if (effective.deniedBy === 'instance' && !effective.canOptIn) {
		return i18n.baseText('runtimeCredentials.project.access.deniedByInstance.tooltip');
	}
	if (effective.canOptIn && effective.access === 'deny') {
		return i18n.baseText('runtimeCredentials.project.access.optIn.tooltip');
	}
	return undefined;
}

function accessLabel(row: ProjectInputRow): string {
	return row.effective.deniedBy === 'instance' && !row.effective.canOptIn
		? i18n.baseText('runtimeCredentials.project.access.deniedByInstance')
		: i18n.baseText(ACCESS_LABEL_KEY[row.effective.access]);
}

function onSelect(row: ProjectInputRow, access: Access) {
	if (access === row.effective.access) return;
	emit('change', row.credentialType, access, row.displayName);
}
</script>

<template>
	<div :class="$style.table">
		<N8nInput
			v-if="showSearch"
			v-model="search"
			:placeholder="i18n.baseText('runtimeCredentials.project.search.placeholder')"
			:class="$style.search"
			size="large"
			clearable
			data-test-id="runtime-project-search"
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
		</N8nInput>
		<N8nDataTableServer
			v-model:sort-by="sortBy"
			:headers="headers"
			:items="filteredRows"
			:items-length="filteredRows.length"
			item-value="credentialType"
			:pagination="false"
			data-test-id="runtime-project-table"
		>
			<template v-if="noMatch" #cover>
				<N8nEmptyState
					size="small"
					:description="i18n.baseText('runtimeCredentials.project.search.noMatch')"
					:button-text="i18n.baseText('runtimeCredentials.project.search.clear')"
					data-test-id="runtime-project-no-match"
					@click:button="search = ''"
				/>
			</template>
			<template #[`item.displayName`]="{ item }">
				<div :class="$style.type" :data-test-id="`runtime-project-type-${item.credentialType}`">
					<component
						:is="CredentialTypeIcon"
						v-if="CredentialTypeIcon"
						:credential-type-name="item.credentialType"
						:size="20"
						:class="$style.typeIcon"
					/>
					<N8nIcon v-else icon="key-round" :class="$style.typeIcon" />
					<div :class="$style.typeText">
						<N8nText color="text-dark" bold :class="$style.ellipsis">{{
							item.displayName
						}}</N8nText>
						<N8nText
							v-if="item.displayName !== item.credentialType"
							color="text-light"
							size="small"
							:class="$style.ellipsis"
						>
							{{ item.credentialType }}
						</N8nText>
					</div>
				</div>
			</template>
			<template #[`item.rules`]="{ item }">
				<ul :class="$style.rules">
					<li v-for="rule in item.rules" :key="rule.alias" :class="$style.rule">
						<N8nText bold>{{ rule.alias }}</N8nText>
						<N8nText color="text-light" size="small" :class="$style.ellipsis">
							{{ ruleContext(rule) }}
						</N8nText>
					</li>
				</ul>
			</template>
			<template #[`item.access`]="{ item }">
				<div :class="$style.access">
					<N8nTooltip :disabled="!tooltipOf(item)" placement="top">
						<template #content>{{ tooltipOf(item) }}</template>
						<N8nDropdownMenu
							v-if="isEditable(item)"
							:items="accessMenuItems[item.effective.access]"
							placement="bottom-start"
							:data-test-id="`runtime-project-access-${item.credentialType}`"
							@select="(access: Access) => onSelect(item, access)"
						>
							<template #trigger>
								<N8nButton
									variant="ghost"
									size="small"
									:aria-label="
										i18n.baseText('runtimeCredentials.project.access.ariaLabel', {
											interpolate: { name: item.displayName },
										})
									"
								>
									<!-- A spinner and not a disabled button: a disabled button loses the focus. -->
									<N8nIcon
										v-if="savingType === item.credentialType"
										icon="loader-circle"
										size="small"
										spin
									/>
									<N8nIcon v-else v-bind="ACCESS_ICON[item.effective.access]" size="small" />
									{{ accessLabel(item) }}
									<N8nIcon icon="chevron-down" size="small" />
								</N8nButton>
							</template>
							<template #item-leading="{ item: menuItem, ui }">
								<N8nIcon v-bind="ACCESS_ICON[menuItem.id]" :class="ui.class" />
							</template>
						</N8nDropdownMenu>
						<div
							v-else
							:class="$style.readOnly"
							:data-test-id="`runtime-project-access-${item.credentialType}`"
						>
							<N8nIcon v-bind="ACCESS_ICON[item.effective.access]" size="small" />
							<N8nText>{{ accessLabel(item) }}</N8nText>
						</div>
					</N8nTooltip>
					<N8nTooltip v-if="!item.effective.exact" placement="top">
						<template #content>
							{{ i18n.baseText('runtimeCredentials.project.access.inexact.tooltip') }}
						</template>
						<N8nIcon
							icon="info"
							size="small"
							color="text-light"
							:data-test-id="`runtime-project-inexact-${item.credentialType}`"
						/>
					</N8nTooltip>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.table {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.search {
	/* No width token fits; this matches the search box of the policy table. */
	width: 292px;
}

.type {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.typeIcon {
	flex-shrink: 0;
}

.typeText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.ellipsis {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rules {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.rule {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.access {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.readOnly {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	/* Lines the label up with the trigger button, which has its own inner padding. */
	padding-inline: var(--spacing--2xs);
}
</style>
