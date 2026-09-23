<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDialogFooter,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { MODAL_CANCEL } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import McpDetailBody from './McpDetailBody.vue';
import type { McpServerConnectionItem, McpToolSettings } from './types';
import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type McpToolCategory,
	type McpToolPermission,
} from '@n8n/api-types';

const props = defineProps<{
	item: McpServerConnectionItem;
}>();

const emit = defineEmits<{
	save: [settings: McpToolSettings];
	disconnect: [];
	cancel: [];
	reconnect: [];
	retry: [];
}>();

const i18n = useI18n();
const message = useMessage();
const isConnectionUnhealthy = computed(() => props.item.status === 'disconnected');
const arePermissionsDisabled = computed(() => props.item.status !== 'connected');
const failureMessageKey = computed<BaseTextKey>(() => {
	switch (props.item.connectionFailureReason) {
		case 'authentication':
			return 'tools.connection.failure.authentication';
		case 'server_unavailable':
			return 'tools.connection.failure.serverUnavailable';
		default:
			return 'tools.connection.failure.unknown';
	}
});
const recoveryActionKey = computed<BaseTextKey>(() =>
	props.item.connectionFailureReason === 'authentication'
		? 'tools.connection.action.reconnect'
		: 'generic.retry',
);

const initialSettings = (): McpToolSettings =>
	props.item.settings ?? {
		categories: {
			read: DEFAULT_INSTANCE_AI_PERMISSIONS.mcpRead,
			write: DEFAULT_INSTANCE_AI_PERMISSIONS.mcpWrite,
		},
	};

const categories = ref({ ...initialSettings().categories });
const toolPermissions = ref({ ...initialSettings().tools });
const expandedCategory = ref<McpToolCategory | null>(null);
const hasSavedBefore = ref(false);

watch(
	() => props.item.id,
	() => {
		hasSavedBefore.value = false;
		const next = initialSettings();
		categories.value = { ...next.categories };
		toolPermissions.value = { ...next.tools };
		expandedCategory.value = null;
	},
);

watch(
	() => props.item.status,
	(status) => {
		if (status !== 'connected') expandedCategory.value = null;
	},
);

const permissionOptions: Array<{ value: McpToolPermission; label: string }> = [
	{
		value: 'always_allow',
		label: i18n.baseText('tools.connection.permissions.alwaysAllow'),
	},
	{
		value: 'require_approval',
		label: i18n.baseText('tools.connection.permissions.requireApproval'),
	},
	{ value: 'blocked', label: i18n.baseText('tools.connection.permissions.blocked') },
];

const categoryContent: Record<McpToolCategory, { title: BaseTextKey; description: BaseTextKey }> = {
	read: {
		title: 'tools.connection.permissions.read.title',
		description: 'tools.connection.permissions.read.description',
	},
	write: {
		title: 'tools.connection.permissions.write.title',
		description: 'tools.connection.permissions.write.description',
	},
};

const groups = computed(() =>
	(['read', 'write'] as const).map((category) => ({
		category,
		title: i18n.baseText(categoryContent[category].title),
		description: i18n.baseText(categoryContent[category].description),
		tools: props.item.availableTools.filter((tool) => (tool.category ?? 'write') === category),
	})),
);

async function updateCategory(category: McpToolCategory, permission: McpToolPermission) {
	if (
		category === 'write' &&
		permission === 'always_allow' &&
		categories.value.write !== 'always_allow'
	) {
		const writeToolCount = props.item.availableTools.filter(
			(tool) => (tool.category ?? 'write') === 'write',
		).length;
		const confirmed = await message.confirm(
			i18n.baseText('tools.connection.permissions.write.confirm.description.assistant', {
				interpolate: { server: props.item.title, count: writeToolCount },
			}),
			{
				title: i18n.baseText('tools.connection.permissions.write.confirm.title'),
				confirmButtonText: i18n.baseText('tools.connection.permissions.write.confirm.keepAsk'),
				cancelButtonText: i18n.baseText('tools.connection.permissions.write.confirm.allow'),
			},
		);
		if (confirmed !== MODAL_CANCEL) return;
	}

	categories.value[category] = permission;
	const next = { ...toolPermissions.value };
	for (const tool of props.item.availableTools) {
		if ((tool.category ?? 'write') === category) delete next[tool.id];
	}
	toolPermissions.value = next;
}

function updateTool(toolId: string, category: McpToolCategory, permission: McpToolPermission) {
	const next = { ...toolPermissions.value };
	if (permission === categories.value[category]) delete next[toolId];
	else next[toolId] = permission;
	toolPermissions.value = next;
}

function isPermission(value: unknown): value is McpToolPermission {
	return value === 'always_allow' || value === 'require_approval' || value === 'blocked';
}

function onCategoryChange(category: McpToolCategory, value: unknown) {
	if (isPermission(value)) void updateCategory(category, value);
}

function onToolChange(toolId: string, category: McpToolCategory, value: unknown) {
	if (isPermission(value)) updateTool(toolId, category, value);
}

function hasCategoryOverrides(category: McpToolCategory): boolean {
	return props.item.availableTools.some(
		(tool) =>
			(tool.category ?? 'write') === category && toolPermissions.value[tool.id] !== undefined,
	);
}

const hasChanges = computed(() => {
	if (!hasSavedBefore.value) return true;
	return (
		JSON.stringify({ categories: categories.value, tools: toolPermissions.value }) !==
		JSON.stringify({
			categories: initialSettings().categories,
			tools: initialSettings().tools ?? {},
		})
	);
});

function handleSave() {
	if (!hasChanges.value) return;
	hasSavedBefore.value = true;
	emit('save', {
		categories: { ...categories.value },
		...(Object.keys(toolPermissions.value).length > 0
			? { tools: { ...toolPermissions.value } }
			: {}),
	});
}

function handleRecovery() {
	if (props.item.connectionFailureReason === 'authentication') emit('reconnect');
	else emit('retry');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.body">
			<McpDetailBody :item="item" />

			<N8nCallout
				v-if="isConnectionUnhealthy"
				theme="danger"
				data-test-id="tools-connection-failure"
			>
				{{ i18n.baseText(failureMessageKey) }}
				<template #actions>
					<N8nButton
						variant="ghost"
						size="small"
						data-test-id="tools-connection-recovery"
						@click="handleRecovery"
					>
						{{ i18n.baseText(recoveryActionKey) }}
					</N8nButton>
				</template>
			</N8nCallout>

			<div :class="$style.field">
				<N8nText :class="$style.fieldLabel" tag="h3" size="medium" bold>
					{{ i18n.baseText('tools.connection.permissions.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('tools.connection.permissions.description.assistant') }}
				</N8nText>
			</div>

			<div v-for="group in groups" :key="group.category" :class="$style.permissionGroup">
				<div :class="$style.groupHeader">
					<N8nButton
						variant="subtle"
						size="small"
						icon-only
						:disabled="arePermissionsDisabled"
						:aria-label="group.title"
						:aria-expanded="expandedCategory === group.category"
						@click="expandedCategory = expandedCategory === group.category ? null : group.category"
					>
						<N8nIcon
							:icon="expandedCategory === group.category ? 'chevron-down' : 'chevron-right'"
							:size="16"
						/>
					</N8nButton>
					<div :class="$style.groupSummary">
						<div :class="$style.groupTitle">
							<N8nText bold>{{ group.title }}</N8nText>
							<N8nBadge
								:show-border="false"
								:data-test-id="`tools-connection-count-${group.category}`"
								theme="tertiary"
								size="xsmall"
							>
								{{ arePermissionsDisabled ? '—' : group.tools.length }}
							</N8nBadge>
						</div>
						<N8nText size="small" color="text-light">{{ group.description }}</N8nText>
					</div>
					<N8nSelect
						:class="$style.permissionSelect"
						:model-value="
							hasCategoryOverrides(group.category) ? undefined : categories[group.category]
						"
						:placeholder="hasCategoryOverrides(group.category) ? ' ' : undefined"
						size="small"
						:disabled="arePermissionsDisabled"
						:data-test-id="`tools-connection-permission-${group.category}`"
						@update:model-value="onCategoryChange(group.category, $event)"
					>
						<template v-if="hasCategoryOverrides(group.category)" #prefix>
							<N8nText size="small">
								{{ i18n.baseText('tools.connection.permissions.custom') }}
							</N8nText>
						</template>
						<N8nOption
							v-for="option in permissionOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</div>

				<div v-if="expandedCategory === group.category" :class="$style.toolList">
					<div v-for="tool in group.tools" :key="tool.id" :class="$style.toolRow">
						<div :class="$style.toolSummary">
							<N8nText size="small" bold>{{ tool.name }}</N8nText>
							<N8nText
								v-if="tool.description"
								:class="$style.toolDescription"
								:title="tool.description"
								size="small"
								color="text-light"
							>
								{{ tool.description }}
							</N8nText>
						</div>
						<N8nSelect
							:class="$style.permissionSelect"
							:model-value="toolPermissions[tool.id] ?? categories[group.category]"
							size="small"
							:disabled="arePermissionsDisabled"
							@update:model-value="onToolChange(tool.id, group.category, $event)"
						>
							<N8nOption
								v-for="option in permissionOptions"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>
					</div>
				</div>
			</div>
		</div>

		<N8nDialogFooter :class="$style.footer">
			<N8nButton
				:class="$style.removeButton"
				variant="outline"
				size="small"
				data-test-id="tools-connection-settings-remove"
				@click="emit('disconnect')"
			>
				<N8nIcon icon="trash-2" :size="14" :class="$style.footerIcon" />
				<span>{{ i18n.baseText('tools.connection.settings.remove') }}</span>
			</N8nButton>
			<N8nButton
				variant="subtle"
				size="small"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="tools-connection-settings-cancel"
				@click="emit('cancel')"
			/>
			<N8nButton
				variant="solid"
				size="small"
				:label="i18n.baseText('generic.save')"
				:disabled="!hasChanges || arePermissionsDisabled"
				data-test-id="tools-connection-settings-save"
				@click="handleSave"
			/>
		</N8nDialogFooter>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.body {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 0;
	overflow-y: auto;
	scrollbar-gutter: stable;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.fieldLabel {
	color: var(--color--text);
}

.permissionGroup {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--md);
}

.groupHeader,
.toolRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
}

.groupSummary,
.toolSummary {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.groupTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.toolList {
	display: flex;
	flex-direction: column;
	border-top: var(--border);
}

.toolRow + .toolRow {
	border-top: var(--border);
}

.toolDescription {
	display: -webkit-box;
	overflow: hidden;
	overflow-wrap: anywhere;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.permissionSelect {
	flex: 0 0 auto;
	width: auto;
}

.footer {
	flex-shrink: 0;
}

.removeButton {
	margin-right: auto;
}

.footerIcon {
	margin-right: var(--spacing--5xs);
}
</style>
