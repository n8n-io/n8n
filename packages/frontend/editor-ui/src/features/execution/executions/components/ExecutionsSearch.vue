<script lang="ts" setup>
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { EXECUTION_SEARCH_TEXT_MAX_LENGTH, EXECUTION_SEARCH_TEXT_MIN_LENGTH } from '@n8n/api-types';
import { N8nIcon, N8nInput, N8nOption, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, ref, watch } from 'vue';
import { DEBUG_PAYWALL_MODAL_KEY } from '../executions.constants';
import type { ExecutionSearchCriteria } from '../executions.types';

const props = withDefaults(
	defineProps<{
		/** The search that the list shows now. */
		search: ExecutionSearchCriteria;
		/** Names of the nodes to search in. Empty when no single workflow is in scope. */
		nodeNames?: string[];
		layout?: 'row' | 'column';
	}>(),
	{ nodeNames: () => [], layout: 'row' },
);

const emit = defineEmits<{
	'update:search': [value: ExecutionSearchCriteria];
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const isLicensed = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);

const text = ref(props.search.text);
const isTooShort = ref(false);

watch(
	() => props.search.text,
	(value) => {
		text.value = value;
		isTooShort.value = false;
	},
);

const trimmedText = computed(() => text.value.trim());
const isTextValid = computed(
	() => trimmedText.value === '' || trimmedText.value.length >= EXECUTION_SEARCH_TEXT_MIN_LENGTH,
);
// Each search reads stored execution data, so it starts on Enter and not on each key.
const isWaitingForEnter = computed(
	() => isTextValid.value && trimmedText.value !== props.search.text,
);
const hasNodes = computed(() => props.nodeNames.length > 0);

function submitText() {
	if (!isTextValid.value) {
		isTooShort.value = true;
		return;
	}
	if (trimmedText.value === props.search.text) return;

	emit('update:search', { text: trimmedText.value, nodeName: props.search.nodeName });
}

function onTextChange(value: string) {
	text.value = value;
	isTooShort.value = false;

	// The clear button empties the field. Then the list must not stay on the old search.
	if (value === '' && props.search.text !== '') submitText();
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') submitText();
}

function onNodeChange(nodeName: string | null | undefined) {
	emit('update:search', {
		text: isTextValid.value ? trimmedText.value : props.search.text,
		nodeName: nodeName ?? '',
	});
}

const KEYS_WITHOUT_INTENT = ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'];

// Without the license, the search looks usable and each use opens the paywall. This is the
// same behavior as the "Copy to editor" button.
function onLockedInteraction(event: Event) {
	if (isLicensed.value) return;

	if (event instanceof KeyboardEvent) {
		const isShortcut = event.ctrlKey || event.metaKey || event.altKey;
		if (isShortcut || KEYS_WITHOUT_INTENT.includes(event.key)) return;
	}

	event.preventDefault();
	event.stopPropagation();

	uiStore.openModalWithData({
		name: DEBUG_PAYWALL_MODAL_KEY,
		data: {
			title: i18n.baseText('executionsSearch.paywall.title'),
			content: i18n.baseText('executionsSearch.paywall.content'),
			footerButtonAction: () => {
				uiStore.closeModal(DEBUG_PAYWALL_MODAL_KEY);
				// The search has the same license as the highlighted data filter, so it has the same upgrade path.
				void pageRedirectionHelper.goToUpgrade('custom-data-filter', 'upgrade-custom-data-filter');
			},
		},
	});
}
</script>

<template>
	<div
		:class="[$style.search, $style[layout]]"
		data-test-id="executions-search"
		@click.capture="onLockedInteraction"
		@keydown.capture="onLockedInteraction"
	>
		<div :class="$style.text">
			<N8nInput
				:model-value="text"
				type="text"
				size="medium"
				clearable
				:maxlength="EXECUTION_SEARCH_TEXT_MAX_LENGTH"
				:placeholder="i18n.baseText('executionsSearch.placeholder')"
				:aria-label="i18n.baseText('executionsSearch.placeholder')"
				:aria-invalid="isTooShort"
				data-test-id="executions-search-input"
				@update:model-value="onTextChange"
				@keydown="onKeydown"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
				<template v-if="isWaitingForEnter" #suffix>
					<N8nText size="xsmall" color="text-light" data-test-id="executions-search-enter-hint">
						{{ i18n.baseText('executionsSearch.enterHint') }}
					</N8nText>
				</template>
			</N8nInput>
			<N8nText
				v-if="isTooShort"
				size="xsmall"
				color="danger"
				role="alert"
				data-test-id="executions-search-too-short"
			>
				{{
					i18n.baseText('executionsSearch.tooShort', {
						interpolate: { count: `${EXECUTION_SEARCH_TEXT_MIN_LENGTH}` },
					})
				}}
			</N8nText>
		</div>
		<div :class="$style.node">
			<N8nTooltip
				:disabled="!isLicensed || hasNodes"
				:content="i18n.baseText('executionsSearch.node.selectWorkflowFirst')"
				placement="top"
			>
				<!-- A filterable select opens on focus, which comes before the click that opens the paywall. -->
				<N8nSelect
					:model-value="search.nodeName"
					size="small"
					:filterable="isLicensed"
					clearable
					:disabled="isLicensed && !hasNodes"
					:placeholder="i18n.baseText('executionsSearch.node.any')"
					:aria-label="i18n.baseText('executionsSearch.node.label')"
					data-test-id="executions-search-node-select"
					@update:model-value="onNodeChange"
				>
					<N8nOption v-for="name in nodeNames" :key="name" :label="name" :value="name" />
				</N8nSelect>
			</N8nTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
.search {
	display: flex;
	gap: var(--spacing--2xs);
}

.row {
	align-items: flex-start;

	.text {
		flex: 2 1 0;
		min-width: 0;
	}

	.node {
		flex: 1 1 0;
		min-width: 0;
	}
}

.column {
	flex-direction: column;
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
