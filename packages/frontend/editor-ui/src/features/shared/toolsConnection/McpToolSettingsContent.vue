<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { McpServerConnectionItem, McpToolInclusionMode, McpToolSettings } from './types';

const props = defineProps<{
	item: McpServerConnectionItem;
}>();

const emit = defineEmits<{
	save: [settings: McpToolSettings];
	disconnect: [];
}>();

const i18n = useI18n();

const initialSettings = (): McpToolSettings =>
	props.item.settings ?? {
		inclusionMode: 'all',
		selectedTools: [],
		excludedTools: [],
	};

const inclusionMode = ref<McpToolInclusionMode>(initialSettings().inclusionMode);
const selectedTools = ref<string[]>([...initialSettings().selectedTools]);
const excludedTools = ref<string[]>([...initialSettings().excludedTools]);
const hasSavedBefore = ref(false);

watch(
	() => props.item.id,
	() => {
		hasSavedBefore.value = false;
		const next = initialSettings();
		inclusionMode.value = next.inclusionMode;
		selectedTools.value = [...next.selectedTools];
		excludedTools.value = [...next.excludedTools];
	},
);

const inclusionOptions: Array<{ value: McpToolInclusionMode; label: string }> = [
	{ value: 'all', label: i18n.baseText('tools.connection.settings.inclusion.all') },
	{ value: 'selected', label: i18n.baseText('tools.connection.settings.inclusion.selected') },
	{ value: 'except', label: i18n.baseText('tools.connection.settings.inclusion.except') },
];

const toolOptions = computed(() =>
	props.item.availableTools.map((tool) => ({
		value: tool.id,
		label: tool.name,
		description: tool.description,
	})),
);

const showToolList = computed(
	() => inclusionMode.value === 'selected' || inclusionMode.value === 'except',
);
const toolListLabel = computed(() =>
	inclusionMode.value === 'selected'
		? i18n.baseText('tools.connection.settings.toolsToInclude')
		: i18n.baseText('tools.connection.settings.toolsToExclude'),
);
const toolListTestId = computed(() =>
	inclusionMode.value === 'selected'
		? 'tools-connection-settings-selected'
		: 'tools-connection-settings-excluded',
);
const toolListSelection = computed<string[]>({
	get: () => (inclusionMode.value === 'except' ? excludedTools.value : selectedTools.value),
	set: (value) => {
		if (inclusionMode.value === 'except') excludedTools.value = value;
		else selectedTools.value = value;
	},
});

function toolsKey(tools: string[]): string {
	return JSON.stringify([...tools].sort());
}

const hasChanges = computed(() => {
	if (!hasSavedBefore.value) return true;
	const saved = initialSettings();
	if (inclusionMode.value !== saved.inclusionMode) return true;
	if (inclusionMode.value === 'selected') {
		return toolsKey(selectedTools.value) !== toolsKey(saved.selectedTools);
	}
	if (inclusionMode.value === 'except') {
		return toolsKey(excludedTools.value) !== toolsKey(saved.excludedTools);
	}
	return false;
});

function handleSave() {
	if (!hasChanges.value) return;
	hasSavedBefore.value = true;
	emit('save', {
		inclusionMode: inclusionMode.value,
		selectedTools: [...selectedTools.value],
		excludedTools: [...excludedTools.value],
	});
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.body">
			<div :class="$style.field">
				<N8nText :class="$style.fieldLabel" tag="label" size="small">
					{{ i18n.baseText('tools.connection.settings.toolInclusion') }}
				</N8nText>
				<N8nSelect
					v-model="inclusionMode"
					size="small"
					data-test-id="tools-connection-settings-inclusion"
				>
					<N8nOption
						v-for="opt in inclusionOptions"
						:key="opt.value"
						:value="opt.value"
						:label="opt.label"
					/>
				</N8nSelect>
			</div>

			<div v-if="showToolList" :class="$style.field">
				<N8nText :class="$style.fieldLabel" tag="label" size="small">
					{{ toolListLabel }}
				</N8nText>
				<N8nSelect
					v-model="toolListSelection"
					multiple
					filterable
					size="small"
					:class="$style.multiSelect"
					:placeholder="i18n.baseText('tools.connection.settings.toolsPlaceholder')"
					:data-test-id="toolListTestId"
				>
					<N8nOption
						v-for="opt in toolOptions"
						:key="opt.value"
						:value="opt.value"
						:label="opt.label"
					>
						<div :class="$style.listOption">
							<div :class="$style.optionHeadline">{{ opt.label }}</div>
							<div v-if="opt.description" :class="$style.optionDescription">
								{{ opt.description }}
							</div>
						</div>
					</N8nOption>
				</N8nSelect>
			</div>
		</div>

		<footer :class="$style.footer">
			<N8nButton
				variant="outline"
				size="small"
				data-test-id="tools-connection-settings-remove"
				@click="emit('disconnect')"
			>
				<N8nIcon icon="trash-2" :size="14" :class="$style.footerIcon" />
				<span>{{ i18n.baseText('tools.connection.settings.remove') }}</span>
			</N8nButton>
			<N8nButton
				variant="solid"
				size="small"
				:label="i18n.baseText('tools.connection.settings.save')"
				:disabled="!hasChanges"
				data-test-id="tools-connection-settings-save"
				@click="handleSave"
			/>
		</footer>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: 100%;
}

.body {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.multiSelect {
	// Cap the chip-container height so a long selection scrolls instead of
	// blowing up the dialog vertically. Matches the tighter Figma rhythm.
	:global(.el-select__wrapper) {
		min-height: 40px;
		max-height: 96px;
		overflow-y: auto;
	}
}

.fieldLabel {
	color: var(--color--text);
}

.listOption {
	margin: 6px 0;
	padding-right: 20px;
	white-space: normal;
}

.optionHeadline {
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	overflow-wrap: break-word;
}

.optionDescription {
	margin-top: 2px;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--xl);
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	text-overflow: ellipsis;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: var(--spacing--md);
	border-top: 1px solid var(--color--foreground--shade-1);
}

.footerIcon {
	margin-right: var(--spacing--5xs);
}
</style>
