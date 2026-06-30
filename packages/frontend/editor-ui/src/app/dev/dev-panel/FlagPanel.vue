<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { type Flag, type FlagValue, useFeatureFlags } from './useFeatureFlags';

const emit = defineEmits<{
	close: [];
}>();

const { flags, overrides, refresh, setOverride, removeOverride, clearAll } = useFeatureFlags();

const filter = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const dropdown = ref<{ flag: string; top: number; left: number } | null>(null);
const customValue = ref('');

const filteredFlags = computed(() => {
	const q = filter.value.trim().toLowerCase();
	if (!q) return flags.value;
	return flags.value.filter((f) => f.name.toLowerCase().includes(q));
});

const overrideCount = computed(() => Object.keys(overrides.value).length);
const flagCount = computed(() => flags.value.length);
const countLabel = computed(() => {
	const o = overrideCount.value;
	const f = flagCount.value;
	return `${o} override${o === 1 ? '' : 's'} · ${f} flag${f === 1 ? '' : 's'}`;
});

const dropdownFlag = computed<Flag | null>(() => {
	if (!dropdown.value) return null;
	return flags.value.find((f) => f.name === dropdown.value?.flag) ?? null;
});

const variantOptions = computed<string[]>(() => {
	const f = dropdownFlag.value;
	if (!f) return [];
	const detected = typeof f.phValue === 'string' ? f.phValue : 'variant';
	const second = detected === 'control' ? 'variant' : detected;
	return ['control', second];
});

function formatPhValue(value: FlagValue | undefined): string {
	if (value === undefined) return '—';
	if (typeof value === 'string') return `"${value}"`;
	return String(value);
}

function openDropdown(flag: string, event: MouseEvent) {
	const target = event.currentTarget;
	if (!(target instanceof HTMLElement)) return;
	if (dropdown.value?.flag === flag) {
		dropdown.value = null;
		return;
	}
	const rect = target.getBoundingClientRect();
	dropdown.value = { flag, top: rect.bottom + 4, left: rect.right };
	customValue.value = '';
}

function closeDropdown() {
	dropdown.value = null;
}

function applyValue(flag: string, value: FlagValue) {
	setOverride(flag, value);
	closeDropdown();
}

function applyCustom(flag: string) {
	const v = customValue.value.trim();
	if (!v) return;
	applyValue(flag, v);
}

function reload() {
	window.location.reload();
}

function handleKeyDown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		if (dropdown.value) {
			event.stopPropagation();
			closeDropdown();
			return;
		}
		emit('close');
	}
}

function handleDocumentClick(event: MouseEvent) {
	if (!dropdown.value) return;
	const target = event.target;
	if (!(target instanceof Element)) return;
	if (target.closest('[data-flag-dropdown]')) return;
	if (target.closest('[data-override-trigger]')) return;
	closeDropdown();
}

onMounted(() => {
	refresh();
	window.addEventListener('keydown', handleKeyDown, true);
	document.addEventListener('click', handleDocumentClick, true);
	void nextTick(() => searchInput.value?.focus());
});

onUnmounted(() => {
	window.removeEventListener('keydown', handleKeyDown, true);
	document.removeEventListener('click', handleDocumentClick, true);
});

watch(filter, () => {
	closeDropdown();
});
</script>

<template>
	<div class="flag-panel" role="dialog" aria-label="Feature flag overrides">
		<header class="flag-panel-header">
			<span class="flag-panel-title">Feature flags</span>
			<div class="flag-panel-header-actions">
				<button
					type="button"
					class="flag-panel-button"
					:disabled="overrideCount === 0"
					@click="clearAll"
				>
					Clear all
				</button>
				<button type="button" class="flag-panel-button" title="Close" @click="emit('close')">
					&times;
				</button>
			</div>
		</header>

		<div class="flag-panel-search">
			<input
				ref="searchInput"
				v-model="filter"
				type="text"
				placeholder="Filter flags..."
				spellcheck="false"
			/>
		</div>

		<div class="flag-panel-columns" aria-hidden="true">
			<span class="flag-col-name">Flag</span>
			<span class="flag-col-ph">PostHog</span>
			<span class="flag-col-ovr">Override</span>
		</div>

		<div class="flag-panel-list">
			<div v-if="filteredFlags.length === 0" class="flag-panel-empty">
				{{ flagCount === 0 ? 'No flags found. Is PostHog loaded?' : 'No flags match filter.' }}
			</div>

			<div
				v-for="flag in filteredFlags"
				:key="flag.name"
				class="flag-row"
				:class="{ 'flag-row--overridden': flag.override !== undefined }"
			>
				<span class="flag-name" :title="flag.name">{{ flag.name }}</span>
				<span class="flag-ph">
					<span
						class="flag-dot"
						:class="{
							'flag-dot--variant': flag.isVariant,
							'flag-dot--on': !flag.isVariant && flag.phValue === true,
							'flag-dot--off':
								!flag.isVariant && (flag.phValue === false || flag.phValue === undefined),
						}"
					/>
					<span class="flag-ph-value">{{ formatPhValue(flag.phValue) }}</span>
				</span>
				<button
					v-if="flag.override === undefined"
					type="button"
					class="flag-override-add"
					data-override-trigger
					title="Set override"
					@click="openDropdown(flag.name, $event)"
				>
					+
				</button>
				<button
					v-else
					type="button"
					class="flag-override-chip"
					:class="{ 'flag-override-chip--variant': flag.isVariant }"
					data-override-trigger
					:title="`Override: ${flag.override}`"
					@click="openDropdown(flag.name, $event)"
				>
					{{ String(flag.override) }}
				</button>
			</div>
		</div>

		<footer class="flag-panel-footer">
			<span class="flag-panel-count">{{ countLabel }}</span>
			<button type="button" class="flag-panel-reload" @click="reload">Reload &amp; Apply</button>
		</footer>

		<div
			v-if="dropdown && dropdownFlag"
			class="flag-dropdown"
			data-flag-dropdown
			:style="{ top: `${dropdown.top}px`, left: `${dropdown.left}px` }"
		>
			<template v-if="!dropdownFlag.isVariant">
				<button
					type="button"
					class="flag-dropdown-item"
					@click="applyValue(dropdownFlag.name, true)"
				>
					true
				</button>
				<button
					type="button"
					class="flag-dropdown-item"
					@click="applyValue(dropdownFlag.name, false)"
				>
					false
				</button>
			</template>
			<template v-else>
				<button
					v-for="opt in variantOptions"
					:key="opt"
					type="button"
					class="flag-dropdown-item"
					@click="applyValue(dropdownFlag.name, opt)"
				>
					{{ opt }}
				</button>
				<div class="flag-dropdown-custom">
					<input
						v-model="customValue"
						type="text"
						placeholder="custom..."
						spellcheck="false"
						@keydown.enter.stop="applyCustom(dropdownFlag.name)"
						@keydown.stop
					/>
					<button type="button" @click="applyCustom(dropdownFlag.name)">Set</button>
				</div>
			</template>
			<button
				v-if="dropdownFlag.override !== undefined"
				type="button"
				class="flag-dropdown-item flag-dropdown-item--remove"
				@click="
					removeOverride(dropdownFlag.name);
					closeDropdown();
				"
			>
				Remove
			</button>
		</div>
	</div>
</template>

<style scoped>
.flag-panel {
	position: fixed;
	right: var(--spacing--sm);
	bottom: calc(var(--spacing--sm) + 56px);
	width: min(520px, calc(100vw - var(--spacing--md)));
	height: min(480px, calc(100vh - 120px));
	display: flex;
	flex-direction: column;
	background: var(--color--neutral-900);
	color: var(--color--neutral-50);
	border-radius: var(--radius--lg);
	box-shadow: 0 6px 20px var(--color--black-alpha-400);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	overflow: visible;
	z-index: 2147483645;
	color-scheme: dark;
	scrollbar-width: thin;
	scrollbar-color: gray transparent;
}

.flag-panel-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 12%, transparent);
}

.flag-panel-title {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
}

.flag-panel-header-actions {
	display: flex;
	gap: var(--spacing--3xs);
}

.flag-panel-button {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 16%, transparent);
	background: transparent;
	color: var(--color--neutral-50);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	cursor: pointer;
}

.flag-panel-button:hover:not(:disabled) {
	background: color-mix(in srgb, var(--color--neutral-50) 10%, transparent);
}

.flag-panel-button:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.flag-panel-search input {
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: transparent;
	border: none;
	border-bottom: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 12%, transparent);
	color: var(--color--neutral-50);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	outline: none;
}

.flag-panel-search input::placeholder {
	color: color-mix(in srgb, var(--color--neutral-50) 40%, transparent);
}

.flag-panel-columns {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.5px;
	text-transform: uppercase;
	color: color-mix(in srgb, var(--color--neutral-50) 50%, transparent);
	border-bottom: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 8%, transparent);
}

.flag-col-name {
	flex: 1;
	min-width: 0;
}

.flag-col-ph {
	flex: 0 0 90px;
}

.flag-col-ovr {
	flex: 0 0 80px;
}

.flag-panel-list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	overflow-x: hidden;
}

.flag-panel-empty {
	padding: var(--spacing--md) var(--spacing--xs);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: color-mix(in srgb, var(--color--neutral-50) 40%, transparent);
}

.flag-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
}

.flag-row:hover {
	background: color-mix(in srgb, var(--color--neutral-50) 6%, transparent);
}

.flag-name {
	flex: 1;
	min-width: 0;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: color-mix(in srgb, var(--color--neutral-50) 75%, transparent);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.flag-row--overridden .flag-name {
	color: var(--color--warning);
}

.flag-ph {
	flex: 0 0 90px;
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	color: color-mix(in srgb, var(--color--neutral-50) 55%, transparent);
	overflow: hidden;
}

.flag-ph-value {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.flag-dot {
	display: inline-block;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	flex-shrink: 0;
}

.flag-dot--on {
	background: var(--color--success);
}

.flag-dot--off {
	background: color-mix(in srgb, var(--color--neutral-50) 30%, transparent);
}

.flag-dot--variant {
	background: var(--color--secondary);
}

.flag-override-add,
.flag-override-chip {
	flex: 0 0 80px;
	height: 22px;
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.flag-override-add {
	border: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 16%, transparent);
	background: transparent;
	color: color-mix(in srgb, var(--color--neutral-50) 50%, transparent);
}

.flag-override-add:hover {
	background: color-mix(in srgb, var(--color--neutral-50) 10%, transparent);
	color: var(--color--neutral-50);
}

.flag-override-chip {
	border: none;
	background: color-mix(in srgb, var(--color--warning) 25%, transparent);
	color: var(--color--warning);
	font-weight: var(--font-weight--bold);
}

.flag-override-chip--variant {
	background: color-mix(in srgb, var(--color--secondary) 25%, transparent);
	color: var(--color--secondary);
}

.flag-panel-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-top: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 12%, transparent);
}

.flag-panel-count {
	font-size: var(--font-size--2xs);
	color: color-mix(in srgb, var(--color--neutral-50) 50%, transparent);
}

.flag-panel-reload {
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: var(--color--blue-500);
	color: var(--color--neutral-50);
	border: none;
	border-radius: var(--radius);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
}

.flag-panel-reload:hover {
	background: var(--color--blue-600);
}

.flag-dropdown {
	position: fixed;
	transform: translateX(-100%);
	min-width: 140px;
	background: var(--color--neutral-900);
	border: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 16%, transparent);
	border-radius: var(--radius);
	box-shadow: 0 4px 16px var(--color--black-alpha-400);
	z-index: 2147483646;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.flag-dropdown-item {
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: transparent;
	border: none;
	color: var(--color--neutral-50);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	text-align: left;
	cursor: pointer;
}

.flag-dropdown-item:hover {
	background: color-mix(in srgb, var(--color--neutral-50) 10%, transparent);
}

.flag-dropdown-item--remove {
	color: var(--color--danger);
	border-top: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 12%, transparent);
}

.flag-dropdown-custom {
	display: flex;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs);
	border-top: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 12%, transparent);
}

.flag-dropdown-custom input {
	flex: 1;
	min-width: 0;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: color-mix(in srgb, var(--color--neutral-50) 6%, transparent);
	border: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--color--neutral-50) 16%, transparent);
	border-radius: var(--radius--sm);
	color: var(--color--neutral-50);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	outline: none;
}

.flag-dropdown-custom button {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	background: var(--color--blue-500);
	color: var(--color--neutral-50);
	border: none;
	border-radius: var(--radius--sm);
	font-family: inherit;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
}
</style>
