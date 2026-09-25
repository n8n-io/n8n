<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { McpToolCategory, McpToolPermission, McpToolPermissions } from '@n8n/api-types';

import { MODAL_CANCEL } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';

import type { McpServerTool, ToolConnectionStatus } from './types';

const props = withDefaults(
	defineProps<{
		actor?: 'assistant' | 'agent';
		availableTools: McpServerTool[];
		modelValue: McpToolPermissions;
		serverTitle: string;
		status: ToolConnectionStatus;
		supportsApproval?: boolean;
	}>(),
	{
		actor: 'assistant',
		supportsApproval: true,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: McpToolPermissions];
}>();

const i18n = useI18n();
const message = useMessage();
const categories = ref({ ...props.modelValue.categories });
const toolPermissions = ref({ ...props.modelValue.tools });
const expandedCategory = ref<McpToolCategory | null>(null);

watch(
	() => props.modelValue,
	(settings) => {
		categories.value = { ...settings.categories };
		toolPermissions.value = { ...settings.tools };
	},
	{ deep: true },
);

watch(
	() => props.status,
	(status) => {
		if (status !== 'connected') expandedCategory.value = null;
	},
);

const arePermissionsDisabled = computed(() => props.status !== 'connected');
const writeConfirmationDescriptionKey = computed<BaseTextKey>(() =>
	props.actor === 'agent'
		? 'tools.connection.permissions.write.confirm.description.agent'
		: 'tools.connection.permissions.write.confirm.description.assistant',
);

const permissionOptions = computed<Array<{ value: McpToolPermission; label: string }>>(() => [
	{
		value: 'always_allow',
		label: i18n.baseText('tools.connection.permissions.alwaysAllow'),
	},
	...(props.supportsApproval
		? [
				{
					value: 'require_approval' as const,
					label: i18n.baseText('tools.connection.permissions.requireApproval'),
				},
			]
		: []),
	{ value: 'blocked', label: i18n.baseText('tools.connection.permissions.blocked') },
]);
const customPermissionLabel = i18n.baseText('tools.connection.permissions.custom');

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
		tools: props.availableTools.filter((tool) => (tool.category ?? 'write') === category),
	})),
);

function emitSettings() {
	emit('update:modelValue', {
		categories: { ...categories.value },
		...(Object.keys(toolPermissions.value).length > 0
			? { tools: { ...toolPermissions.value } }
			: {}),
	});
}

async function updateCategory(category: McpToolCategory, permission: McpToolPermission) {
	if (
		category === 'write' &&
		permission === 'always_allow' &&
		categories.value.write !== 'always_allow'
	) {
		const writeToolCount = props.availableTools.filter(
			(tool) => (tool.category ?? 'write') === 'write',
		).length;
		const confirmed = await message.confirm(
			i18n.baseText(writeConfirmationDescriptionKey.value, {
				interpolate: { server: props.serverTitle, count: writeToolCount },
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
	for (const tool of props.availableTools) {
		if ((tool.category ?? 'write') === category) delete next[tool.id];
	}
	toolPermissions.value = next;
	emitSettings();
}

function updateTool(toolId: string, category: McpToolCategory, permission: McpToolPermission) {
	const next = { ...toolPermissions.value };
	if (permission === categories.value[category]) delete next[toolId];
	else next[toolId] = permission;
	toolPermissions.value = next;
	emitSettings();
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
	return props.availableTools.some(
		(tool) =>
			(tool.category ?? 'write') === category && toolPermissions.value[tool.id] !== undefined,
	);
}

function isCategoryDisabled(tools: McpServerTool[]): boolean {
	return arePermissionsDisabled.value || tools.length === 0;
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.field">
			<N8nText :class="$style.fieldLabel" tag="h3" size="medium" bold>
				{{ i18n.baseText('tools.connection.permissions.title') }}
			</N8nText>
		</div>

		<div
			:class="[
				$style.permissionGroups,
				{ [$style.permissionGroupsDisabled]: arePermissionsDisabled },
			]"
			:data-disabled="arePermissionsDisabled || undefined"
		>
			<div
				v-for="group in groups"
				:key="group.category"
				:class="[
					$style.permissionGroup,
					{
						[$style.permissionGroupDisabled]: !arePermissionsDisabled && group.tools.length === 0,
					},
				]"
				:data-disabled="group.tools.length === 0 || undefined"
			>
				<div :class="$style.groupHeader">
					<div :class="$style.groupSummary">
						<div :class="$style.groupTitle">
							<N8nText :class="$style.groupTitleText">{{ group.title }}</N8nText>
							<span
								:class="$style.countBadge"
								:data-test-id="`tools-connection-count-${group.category}`"
							>
								<N8nText size="xsmall" bold compact>
									{{ arePermissionsDisabled ? '—' : group.tools.length }}
								</N8nText>
							</span>
						</div>
						<N8nText size="small" color="text-light">{{ group.description }}</N8nText>
					</div>
					<!-- Show "Custom" as selected value when there are overrides -->
					<N8nSelect
						:class="$style.permissionSelect"
						:model-value="
							hasCategoryOverrides(group.category)
								? customPermissionLabel
								: categories[group.category]
						"
						size="small"
						theme="ghost"
						:disabled="isCategoryDisabled(group.tools)"
						:data-test-id="`tools-connection-permission-${group.category}`"
						@update:model-value="onCategoryChange(group.category, $event)"
					>
						<N8nOption
							v-for="option in permissionOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
					<N8nButton
						variant="outline"
						size="small"
						icon-only
						:disabled="isCategoryDisabled(group.tools)"
						:aria-label="group.title"
						:aria-expanded="expandedCategory === group.category"
						@click="expandedCategory = expandedCategory === group.category ? null : group.category"
					>
						<N8nIcon
							:icon="expandedCategory === group.category ? 'chevron-up' : 'chevron-down'"
							:size="16"
						/>
					</N8nButton>
				</div>

				<div v-if="expandedCategory === group.category" :class="$style.toolList">
					<div v-for="tool in group.tools" :key="tool.id" :class="$style.toolRow">
						<div :class="$style.toolSummary">
							<N8nText size="small">{{ tool.name }}</N8nText>
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
	</div>
</template>

<style lang="scss" module>
.container,
.field,
.permissionGroups,
.permissionGroup,
.groupSummary,
.toolSummary {
	display: flex;
	flex-direction: column;
}

.container {
	gap: var(--spacing--2xs);
}

.field {
	gap: var(--spacing--4xs);
}

.fieldLabel {
	color: var(--color--text);
}

.permissionGroups {
	gap: var(--spacing--2xs);
}

.permissionGroupsDisabled {
	opacity: 0.5;
}

.permissionGroupDisabled {
	opacity: 0.5;
}

.permissionGroup {
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--xs);
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-height: var(--height--4xl);
	padding-inline: var(--spacing--sm);
}

.groupSummary,
.toolSummary {
	flex: 1;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.groupSummary {
	padding-block: var(--spacing--xs);
}

.groupTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.groupTitleText {
	font-weight: var(--font-weight--medium);
}

.countBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	min-width: var(--height--3xs);
	height: var(--height--3xs);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--radius--full);
	background: var(--background--active);
	color: var(--text-color--subtler);
}

.toolList {
	display: flex;
	flex-direction: column;
	margin-inline: var(--spacing--sm);
	padding-block: var(--spacing--4xs);
	border-top: 1px solid var(--border-color--subtle);
}

.toolRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--2xs);
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
</style>
