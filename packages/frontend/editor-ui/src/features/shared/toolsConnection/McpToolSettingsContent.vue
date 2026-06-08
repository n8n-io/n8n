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

watch(
	() => props.item.id,
	() => {
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
	props.item.availableTools.map((tool) => ({ value: tool.id, label: tool.name })),
);

const showIncludeList = computed(() => inclusionMode.value === 'selected');
const showExcludeList = computed(() => inclusionMode.value === 'except');

function handleSave() {
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
					size="medium"
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

			<div v-if="showIncludeList" :class="$style.field">
				<N8nText :class="$style.fieldLabel" tag="label" size="small">
					{{ i18n.baseText('tools.connection.settings.toolsToInclude') }}
				</N8nText>
				<N8nSelect
					v-model="selectedTools"
					multiple
					filterable
					size="medium"
					:class="$style.multiSelect"
					:placeholder="i18n.baseText('tools.connection.settings.toolsPlaceholder')"
					data-test-id="tools-connection-settings-selected"
				>
					<N8nOption
						v-for="opt in toolOptions"
						:key="opt.value"
						:value="opt.value"
						:label="opt.label"
					/>
				</N8nSelect>
			</div>

			<div v-if="showExcludeList" :class="$style.field">
				<N8nText :class="$style.fieldLabel" tag="label" size="small">
					{{ i18n.baseText('tools.connection.settings.toolsToExclude') }}
				</N8nText>
				<N8nSelect
					v-model="excludedTools"
					multiple
					filterable
					size="medium"
					:class="$style.multiSelect"
					:placeholder="i18n.baseText('tools.connection.settings.toolsPlaceholder')"
					data-test-id="tools-connection-settings-excluded"
				>
					<N8nOption
						v-for="opt in toolOptions"
						:key="opt.value"
						:value="opt.value"
						:label="opt.label"
					/>
				</N8nSelect>
			</div>
		</div>

		<footer :class="$style.footer">
			<N8nButton
				variant="outline"
				size="small"
				data-test-id="tools-connection-settings-disconnect"
				@click="emit('disconnect')"
			>
				<N8nIcon icon="trash-2" :size="14" :class="$style.footerIcon" />
				<span>{{ i18n.baseText('tools.connection.settings.disconnect') }}</span>
			</N8nButton>
			<N8nButton
				variant="solid"
				size="small"
				:label="i18n.baseText('tools.connection.settings.save')"
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

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: var(--spacing--md);
	border-top: 1px solid var(--color--foreground);
}

.footerIcon {
	margin-right: var(--spacing--5xs);
}
</style>
