<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { N8nColorPicker, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';

interface Props {
	currentColor: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	select: [color: string];
	close: [];
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const selectedColor = ref(props.currentColor);
const recentColors = ref<string[]>([]);

const isDarkMode = computed(() => uiStore.appliedTheme === 'dark');

const RECENT_COLORS_KEY = 'n8n-sticky-recent-colors';
const MAX_RECENT_COLORS = 8;

/**
 * Normalizes hex color codes to 6-digit format
 * Supports both 3-digit (#RGB) and 6-digit (#RRGGBB) formats
 * @param color - Hex color code with or without # prefix
 * @returns Normalized 6-digit hex color with # prefix, or original if invalid
 */
function normalizeHexColor(color: string): string {
	if (!color) return color;

	// Remove # if present and convert to uppercase
	let hex = color.replace(/^#/, '').toUpperCase();

	// Handle 3-digit hex (#RGB -> #RRGGBB)
	if (hex.length === 3 && /^[0-9A-F]{3}$/.test(hex)) {
		hex = hex
			.split('')
			.map((char) => char + char)
			.join('');
	}

	// Validate 6-digit hex
	if (hex.length === 6 && /^[0-9A-F]{6}$/.test(hex)) {
		return `#${hex}`;
	}

	// Return original if invalid
	return color;
}

onMounted(() => {
	loadRecentColors();
});

function loadRecentColors() {
	try {
		const stored = localStorage.getItem(RECENT_COLORS_KEY);
		recentColors.value = stored ? JSON.parse(stored) : [];
	} catch (error) {
		recentColors.value = [];
	}
}

function saveRecentColor(color: string) {
	const updated = [color, ...recentColors.value.filter((c) => c !== color)].slice(
		0,
		MAX_RECENT_COLORS,
	);
	recentColors.value = updated;
	try {
		localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
	} catch (error) {
		console.warn('Failed to save recent colors:', error);
	}
}

function onApply() {
	const normalized = normalizeHexColor(selectedColor.value);
	selectedColor.value = normalized;
	saveRecentColor(normalized);
	emit('select', normalized);
}

function onCancel() {
	emit('close');
}

function selectRecentColor(color: string) {
	selectedColor.value = color;
}
</script>

<template>
	<Teleport to="body">
		<div :class="$style.overlay" @click.self="onCancel">
			<div
				:class="`${$style.modal} ${isDarkMode ? 'sticky-color-modal-dark' : 'sticky-color-modal-light'}`"
			>
				<div :class="$style.header">
					<h3>{{ i18n.baseText('sticky.customColor.title') }}</h3>
				</div>
				<div :class="$style.container">
					<div :class="$style.pickerSection">
						<N8nColorPicker
							v-model="selectedColor"
							:show-alpha="false"
							color-format="hex"
							size="large"
							:show-input="true"
							popper-class="custom-color-picker-popper"
						/>
					</div>

					<div v-if="recentColors.length > 0" :class="$style.recentSection">
						<div :class="$style.recentLabel">
							{{ i18n.baseText('sticky.customColor.recentColors') }}
						</div>
						<div :class="$style.recentColors">
							<div
								v-for="color in recentColors"
								:key="color"
								:class="[$style.recentColor, selectedColor === color ? $style.selected : '']"
								:style="{ backgroundColor: color }"
								@click="selectRecentColor(color)"
							></div>
						</div>
					</div>
				</div>

				<div :class="$style.footer">
					<N8nButton type="secondary" size="medium" @click="onCancel">
						{{ i18n.baseText('sticky.customColor.cancel') }}
					</N8nButton>
					<N8nButton type="primary" size="medium" @click="onApply">
						{{ i18n.baseText('sticky.customColor.apply') }}
					</N8nButton>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<style lang="scss" module>
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.3);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	cursor: default;
}

.modal {
	border-radius: var(--radius--lg);
	width: 400px;
	max-width: 90vw;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	cursor: default;
	overflow: hidden;
}

.header {
	padding: var(--spacing--md);
	border-bottom: 1px solid var(--color--foreground--tint-2);

	h3 {
		margin: 0;
		font-size: var(--font-size--lg);
		font-weight: var(--font-weight--bold);
		color: var(--color--text);
	}
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md);
}

.footer {
	padding: var(--spacing--md);
	border-top: 1px solid var(--color--foreground--tint-2);
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);

	:global(button) {
		cursor: pointer;
	}
}

.pickerSection {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--xs);
	cursor: default;
	width: 100%;

	:global(.n8n-color-picker) {
		width: 100%;
	}

	:global(.el-color-picker) {
		cursor: pointer;
	}
}

.recentSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.recentLabel {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
}

.recentColors {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.recentColor {
	width: 32px;
	height: 32px;
	border-radius: var(--radius);
	border: 1px solid var(--color--foreground--shade-2);
	cursor: pointer;
	transition: transform 0.1s ease;

	&:hover {
		transform: scale(1.1);
	}

	&.selected {
		box-shadow: 0 0 0 2px var(--color--primary);
	}
}
</style>

<style lang="scss">
.custom-color-picker-popper {
	z-index: 99999 !important;
}

// Light theme modal
.sticky-color-modal-light {
	background: var(--color--foreground--tint-2);
}

// Dark theme modal
.sticky-color-modal-dark {
	background: var(--color--background--shade-2);
	color: var(--color--foreground--tint-2);

	h3 {
		color: var(--color--foreground--tint-2);
	}

	:global([class*='recentLabel']) {
		color: var(--color--foreground--tint-1);
	}
}
</style>
