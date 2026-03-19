<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { DialogRoot, DialogPortal, DialogContent, DialogOverlay } from 'reka-ui';
import N8nIcon from '@n8n/design-system/components/N8nIcon';
import N8nScrollArea from '@n8n/design-system/components/N8nScrollArea/N8nScrollArea.vue';
import N8nSpinner from '@n8n/design-system/components/N8nSpinner';
import type { INodePropertyOptions } from 'n8n-workflow';
import type { ModelInfo, SortField, SortDirection, ModelCapability } from './types';
import { ALL_CAPABILITIES, CAPABILITY_META, PROVIDER_COLORS } from './types';
import { getModelMetadata, getProviderDisplayName } from './modelMetadata';

interface Props {
	options: INodePropertyOptions[];
	modelValue?: string;
	loading?: boolean;
	disabled?: boolean;
	defaultValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: '',
	loading: false,
	disabled: false,
	defaultValue: '',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const isOpen = ref(false);
const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement>();
const selectedIndex = ref(0);
const sortField = ref<SortField | null>(null);
const sortDirection = ref<SortDirection>('asc');

function parseModelId(modelId: string): { provider: string; modelName: string } {
	const slashIndex = modelId.indexOf('/');
	if (slashIndex === -1) {
		return { provider: 'unknown', modelName: modelId };
	}
	return {
		provider: modelId.substring(0, slashIndex),
		modelName: modelId.substring(slashIndex + 1),
	};
}

function formatModelDisplayName(modelName: string): string {
	return modelName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const models = computed<ModelInfo[]>(() => {
	return props.options.map((opt) => {
		const { provider, modelName } = parseModelId(String(opt.value));
		const metadata = getModelMetadata(String(opt.value));
		return {
			value: String(opt.value),
			name: opt.name,
			provider,
			providerDisplayName: getProviderDisplayName(provider),
			modelName: formatModelDisplayName(modelName),
			...metadata,
		};
	});
});

const selectedModel = computed<ModelInfo | undefined>(() => {
	return models.value.find((m) => m.value === props.modelValue);
});

const isDefault = computed(() => {
	return props.modelValue === props.defaultValue;
});

const BADGE_PRIORITY: Record<string, number> = { flagship: 0, latest: 1, fastest: 2, cheapest: 3 };

const filteredModels = computed<ModelInfo[]>(() => {
	let result = models.value;

	if (searchQuery.value) {
		const query = searchQuery.value.toLowerCase();
		result = result.filter(
			(m) =>
				m.value.toLowerCase().includes(query) ||
				m.providerDisplayName.toLowerCase().includes(query) ||
				m.modelName.toLowerCase().includes(query),
		);
	}

	if (sortField.value) {
		result = [...result].sort((a, b) => {
			const dir = sortDirection.value === 'asc' ? 1 : -1;
			switch (sortField.value) {
				case 'name':
					return dir * a.value.localeCompare(b.value);
				case 'latency': {
					const aVal = parseFloat(a.latency ?? '999');
					const bVal = parseFloat(b.latency ?? '999');
					return dir * (aVal - bVal);
				}
				case 'inputCost': {
					const aVal = parseFloat((a.inputCost ?? '$999').replace('$', ''));
					const bVal = parseFloat((b.inputCost ?? '$999').replace('$', ''));
					return dir * (aVal - bVal);
				}
				case 'outputCost': {
					const aVal = parseFloat((a.outputCost ?? '$999').replace('$', ''));
					const bVal = parseFloat((b.outputCost ?? '$999').replace('$', ''));
					return dir * (aVal - bVal);
				}
				default:
					return 0;
			}
		});
	} else {
		result = [...result].sort((a, b) => {
			const aIsSelected = a.value === props.modelValue ? 1 : 0;
			const bIsSelected = b.value === props.modelValue ? 1 : 0;
			if (aIsSelected !== bIsSelected) return bIsSelected - aIsSelected;

			const aIsDefault = a.value === props.defaultValue ? 1 : 0;
			const bIsDefault = b.value === props.defaultValue ? 1 : 0;
			if (aIsDefault !== bIsDefault) return bIsDefault - aIsDefault;

			const aBadge = a.badge ? (BADGE_PRIORITY[a.badge] ?? 99) : 99;
			const bBadge = b.badge ? (BADGE_PRIORITY[b.badge] ?? 99) : 99;
			if (aBadge !== bBadge) return aBadge - bBadge;

			const aHasBadge = a.badge ? 0 : 1;
			const bHasBadge = b.badge ? 0 : 1;
			if (aHasBadge !== bHasBadge) return aHasBadge - bHasBadge;

			return a.value.localeCompare(b.value);
		});
	}

	return result;
});

function getProviderColor(provider: string): string {
	return PROVIDER_COLORS[provider.toLowerCase()] ?? '#6b7280';
}

function getProviderInitial(provider: string): string {
	const displayName = getProviderDisplayName(provider);
	return displayName.charAt(0).toUpperCase();
}

function toggleSort(field: SortField) {
	if (sortField.value === field) {
		if (sortDirection.value === 'asc') {
			sortDirection.value = 'desc';
		} else {
			sortField.value = null;
			sortDirection.value = 'asc';
		}
	} else {
		sortField.value = field;
		sortDirection.value = 'asc';
	}
}

function selectModel(model: ModelInfo) {
	emit('update:modelValue', model.value);
	isOpen.value = false;
}

function hasCapability(model: ModelInfo, cap: ModelCapability): boolean {
	return model.capabilities.includes(cap);
}

function getSortIndicator(field: SortField): string {
	if (sortField.value !== field) return '';
	return sortDirection.value === 'asc' ? ' ↑' : ' ↓';
}

function getBadgeClass(badge: string): string {
	switch (badge) {
		case 'flagship':
			return 'badgeFlagship';
		case 'latest':
			return 'badgeLatest';
		case 'fastest':
			return 'badgeFastest';
		case 'cheapest':
			return 'badgeCheapest';
		default:
			return '';
	}
}

function getBadgeLabel(badge: string): string {
	return badge.charAt(0).toUpperCase() + badge.slice(1);
}

function handleKeydown(event: KeyboardEvent) {
	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			selectedIndex.value = Math.min(selectedIndex.value + 1, filteredModels.value.length - 1);
			scrollSelectedIntoView();
			break;
		case 'ArrowUp':
			event.preventDefault();
			selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
			scrollSelectedIntoView();
			break;
		case 'Enter':
			event.preventDefault();
			if (filteredModels.value[selectedIndex.value]) {
				selectModel(filteredModels.value[selectedIndex.value]);
			}
			break;
	}
}

function scrollSelectedIntoView() {
	void nextTick(() => {
		const el = document.querySelector(`[data-model-index="${selectedIndex.value}"]`);
		el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	});
}

watch(isOpen, async (open) => {
	if (open) {
		searchQuery.value = '';
		selectedIndex.value = 0;
		sortField.value = null;
		sortDirection.value = 'asc';
		await nextTick();
		searchInputRef.value?.focus();
	}
});

watch(searchQuery, () => {
	selectedIndex.value = 0;
});
</script>

<template>
	<div :class="$style.modelSelect">
		<button
			:class="[$style.trigger, { [$style.triggerDisabled]: disabled || loading }]"
			:disabled="disabled || loading"
			type="button"
			data-test-id="model-select-trigger"
			@click="isOpen = true"
		>
			<template v-if="loading">
				<N8nSpinner size="medium" />
				<span :class="$style.triggerLoadingText">Loading models...</span>
			</template>
			<template v-else-if="selectedModel">
				<div
					:class="$style.providerIcon"
					:style="{ backgroundColor: getProviderColor(selectedModel.provider) }"
				>
					{{ getProviderInitial(selectedModel.provider) }}
				</div>
				<div :class="$style.triggerText">
					<span :class="$style.triggerTitle">
						{{ selectedModel.providerDisplayName }}: {{ selectedModel.modelName }}
					</span>
					<span :class="$style.triggerSubtitle">{{ selectedModel.value }}</span>
				</div>
				<span
					v-if="selectedModel.badge"
					:class="[$style.triggerBadge, $style[getBadgeClass(selectedModel.badge)]]"
				>
					{{ getBadgeLabel(selectedModel.badge) }}
				</span>
				<span v-if="isDefault" :class="$style.defaultBadge">Default</span>
			</template>
			<template v-else>
				<span :class="$style.triggerPlaceholder">Select a model...</span>
			</template>
			<svg :class="$style.triggerChevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path
					d="M4 6L8 10L12 6"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		<DialogRoot v-model:open="isOpen">
			<DialogPortal>
				<DialogOverlay :class="$style.overlay" />
				<DialogContent
					:class="$style.dialogContent"
					aria-label="Select a model"
					@keydown="handleKeydown"
					@open-auto-focus.prevent
				>
					<div :class="$style.searchContainer">
						<svg :class="$style.searchIcon" width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path
								d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<input
							ref="searchInputRef"
							v-model="searchQuery"
							:class="$style.searchInput"
							type="text"
							placeholder="Search models..."
						/>
						<span v-if="filteredModels.length > 0" :class="$style.resultCount">
							{{ filteredModels.length }} models
						</span>
					</div>

					<div :class="$style.tableHeader">
						<button
							:class="[
								$style.headerCell,
								$style.modelColumn,
								{ [$style.headerCellActive]: sortField === 'name' },
							]"
							@click="toggleSort('name')"
						>
							Model{{ getSortIndicator('name') }}
						</button>
						<button
							:class="[
								$style.headerCell,
								$style.metricColumn,
								{ [$style.headerCellActive]: sortField === 'latency' },
							]"
							@click="toggleSort('latency')"
						>
							Latency{{ getSortIndicator('latency') }}
						</button>
						<button
							:class="[
								$style.headerCell,
								$style.metricColumn,
								{ [$style.headerCellActive]: sortField === 'inputCost' },
							]"
							@click="toggleSort('inputCost')"
						>
							Input ${{ getSortIndicator('inputCost') }}
						</button>
						<button
							:class="[
								$style.headerCell,
								$style.metricColumn,
								{ [$style.headerCellActive]: sortField === 'outputCost' },
							]"
							@click="toggleSort('outputCost')"
						>
							Output ${{ getSortIndicator('outputCost') }}
						</button>
						<div :class="[$style.headerCell, $style.headerCellStatic, $style.capabilitiesColumn]">
							Capabilities
						</div>
					</div>

					<N8nScrollArea max-height="400px" type="hover">
						<div :class="$style.tableBody">
							<button
								v-for="(model, index) in filteredModels"
								:key="model.value"
								:class="[
									$style.tableRow,
									{
										[$style.tableRowSelected]: index === selectedIndex,
										[$style.tableRowActive]: model.value === modelValue,
									},
								]"
								:data-model-index="index"
								type="button"
								@click="selectModel(model)"
								@mouseenter="selectedIndex = index"
							>
								<div :class="[$style.cell, $style.modelColumn]">
									<div
										:class="$style.rowProviderIcon"
										:style="{ backgroundColor: getProviderColor(model.provider) }"
									>
										{{ getProviderInitial(model.provider) }}
									</div>
									<div :class="$style.modelInfo">
										<span :class="$style.modelDisplayName">
											{{ model.providerDisplayName }}: {{ model.modelName }}
										</span>
										<span
											v-if="model.value === defaultValue"
											:class="[$style.badge, $style.badgeDefault]"
										>
											Default
										</span>
										<span
											v-if="model.badge"
											:class="[$style.badge, $style[getBadgeClass(model.badge)]]"
										>
											{{ getBadgeLabel(model.badge) }}
										</span>
									</div>
								</div>
								<div :class="[$style.cell, $style.metricColumn, $style.metricValue]">
									{{ model.latency ?? '—' }}
								</div>
								<div :class="[$style.cell, $style.metricColumn, $style.metricValue]">
									{{ model.inputCost ?? '—' }}
								</div>
								<div :class="[$style.cell, $style.metricColumn, $style.metricValue]">
									{{ model.outputCost ?? '—' }}
								</div>
								<div :class="[$style.cell, $style.capabilitiesColumn]">
									<div :class="$style.capabilityIcons">
										<N8nIcon
											v-for="cap in ALL_CAPABILITIES"
											:key="cap"
											:icon="CAPABILITY_META[cap].icon"
											:size="14"
											:class="[
												$style.capabilityIcon,
												{ [$style.capabilityActive]: hasCapability(model, cap) },
											]"
											:title="CAPABILITY_META[cap].label"
										/>
									</div>
								</div>
							</button>

							<div v-if="filteredModels.length === 0 && searchQuery" :class="$style.noResults">
								No models found for "{{ searchQuery }}"
							</div>
						</div>
					</N8nScrollArea>
				</DialogContent>
			</DialogPortal>
		</DialogRoot>
	</div>
</template>

<style lang="scss" module>
.modelSelect {
	width: 100%;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs);
	background: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;
	text-align: left;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
	min-height: 40px;

	&:hover:not(:disabled) {
		border-color: var(--color--foreground--shade-1);
		background: var(--color--foreground--tint-1);
	}

	&:focus-visible {
		box-shadow: 0 0 0 2px var(--color--secondary);
		outline: none;
	}
}

.triggerDisabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.providerIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	min-width: 32px;
	border-radius: var(--radius);
	color: white;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.triggerText {
	display: flex;
	flex-direction: column;
	gap: 1px;
	flex: 1;
	min-width: 0;
	overflow: hidden;
}

.triggerTitle {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.triggerSubtitle {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.triggerLoadingText {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
}

.triggerPlaceholder {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
}

.triggerBadge {
	display: inline-flex;
	align-items: center;
	padding: 2px var(--spacing--3xs);
	border-radius: var(--radius--full);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	flex-shrink: 0;
}

.defaultBadge {
	display: inline-flex;
	align-items: center;
	padding: 2px var(--spacing--2xs);
	background: var(--color--foreground);
	border-radius: var(--radius--full);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

.triggerChevron {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

/* Overlay + Dialog */
.overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	z-index: 1800;
	animation: overlayFadeIn 150ms ease-out;
}

@keyframes overlayFadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.dialogContent {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: min(680px, calc(100vw - 64px));
	max-height: calc(100vh - 120px);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow:
		rgba(0, 0, 0, 0.12) 0 16px 48px,
		rgba(0, 0, 0, 0.06) 0 4px 12px;
	overflow: hidden;
	z-index: 1801;
	display: flex;
	flex-direction: column;
	animation: dialogSlideIn 150ms cubic-bezier(0.16, 1, 0.3, 1);

	&:focus {
		outline: none;
	}
}

@keyframes dialogSlideIn {
	from {
		opacity: 0;
		transform: translate(-50%, -48%);
	}
	to {
		opacity: 1;
		transform: translate(-50%, -50%);
	}
}

/* Search */
.searchContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.searchIcon {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.searchInput {
	flex: 1;
	border: none;
	outline: none;
	background: transparent;
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	color: var(--color--text);

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.resultCount {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	white-space: nowrap;
}

/* Table header */
.tableHeader {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
	gap: var(--spacing--4xs);
}

.headerCell {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--sm);
	white-space: nowrap;
	text-align: left;
	font-family: var(--font-family);
	transition: color 0.1s ease;

	&:hover {
		color: var(--color--text);
	}
}

.headerCellStatic {
	cursor: default;

	&:hover {
		color: var(--color--text--tint-2);
	}
}

.headerCellActive {
	color: var(--color--text);
	font-weight: var(--font-weight--bold);
}

.modelColumn {
	flex: 1;
	min-width: 0;
}

.metricColumn {
	width: 76px;
	text-align: right;
	flex-shrink: 0;
}

.capabilitiesColumn {
	width: 100px;
	text-align: right;
	justify-content: flex-end;
	flex-shrink: 0;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	padding: var(--spacing--4xs) var(--spacing--2xs);
}

/* Table rows */
.tableBody {
	padding: var(--spacing--4xs) 0;
}

.tableRow {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	gap: var(--spacing--4xs);
	cursor: pointer;
	border: none;
	background: none;
	width: 100%;
	text-align: left;
	border-radius: 0;
	font-family: var(--font-family);
	transition: background-color 0.1s ease;

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}

.tableRowSelected {
	background: var(--color--foreground--tint-1);
}

.tableRowActive {
	background: var(--color--foreground);

	&:hover {
		background: var(--color--foreground--shade-1);
	}
}

.cell {
	display: flex;
	align-items: center;
}

.rowProviderIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	min-width: 24px;
	border-radius: var(--radius--sm);
	color: white;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
}

.modelInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	margin-left: var(--spacing--2xs);
}

.modelDisplayName {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.metricValue {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	justify-content: flex-end;
	font-variant-numeric: tabular-nums;
	padding-right: var(--spacing--2xs);
}

/* Badges */
.badge {
	display: inline-flex;
	align-items: center;
	padding: 1px var(--spacing--3xs);
	border-radius: var(--radius--full);
	font-size: 9px;
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	flex-shrink: 0;
}

.badgeDefault {
	background: var(--color--foreground);
	color: var(--color--text--tint-1);
}

.badgeFlagship {
	background: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
}

.badgeLatest {
	background: var(--color--primary--tint-3);
	color: var(--color--primary--shade-1);
}

.badgeFastest {
	background: #fef3c7;
	color: #92400e;
}

.badgeCheapest {
	background: #ede9fe;
	color: #6d28d9;
}

/* Capabilities */
.capabilityIcons {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
}

.capabilityIcon {
	color: var(--color--foreground);
	transition: color 0.15s ease;
}

.capabilityActive {
	color: var(--color--text--tint-1);
}

/* No results */
.noResults {
	padding: var(--spacing--xl);
	text-align: center;
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}
</style>
