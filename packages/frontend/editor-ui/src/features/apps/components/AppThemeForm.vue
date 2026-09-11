<script setup lang="ts">
import {
	N8nButton,
	N8nColorPicker,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type { AppTheme } from '@n8n/api-types';
import { reactive, ref, watch } from 'vue';

import { useAppsStore } from '@/features/apps/apps.store';

const props = defineProps<{
	projectId: string;
	appId: string;
	theme: AppTheme | null;
}>();

const emit = defineEmits<{
	saved: [theme: AppTheme | null];
}>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

const RADIUS_OPTIONS = ['none', 'sm', 'md', 'lg'] as const;

const form = reactive({
	primary: '',
	background: '',
	surface: '',
	text: '',
	muted: '',
	radius: '' as '' | AppTheme['radius'],
	fontFamily: '',
	contentWidth: '',
	customCss: '',
});

const saving = ref(false);

function loadFromTheme(theme: AppTheme | null) {
	form.primary = theme?.colors?.primary ?? '';
	form.background = theme?.colors?.background ?? '';
	form.surface = theme?.colors?.surface ?? '';
	form.text = theme?.colors?.text ?? '';
	form.muted = theme?.colors?.muted ?? '';
	form.radius = theme?.radius ?? '';
	form.fontFamily = theme?.fontFamily ?? '';
	form.contentWidth = theme?.contentWidth ?? '';
	form.customCss = theme?.customCss ?? '';
}

watch(() => props.theme, loadFromTheme, { immediate: true });

const onSave = async () => {
	saving.value = true;
	const colors = {
		...(form.primary ? { primary: form.primary } : {}),
		...(form.background ? { background: form.background } : {}),
		...(form.surface ? { surface: form.surface } : {}),
		...(form.text ? { text: form.text } : {}),
		...(form.muted ? { muted: form.muted } : {}),
	};
	const theme: AppTheme = {
		...(Object.keys(colors).length > 0 ? { colors } : {}),
		...(form.radius ? { radius: form.radius } : {}),
		...(form.fontFamily ? { fontFamily: form.fontFamily } : {}),
		...(form.contentWidth ? { contentWidth: form.contentWidth } : {}),
		...(form.customCss ? { customCss: form.customCss } : {}),
	};
	try {
		const updated = await appsStore.updateApp(props.projectId, props.appId, { theme });
		emit('saved', updated.theme);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.theme.save.error'));
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<div :class="$style.container" data-test-id="app-theme-form">
		<div :class="$style.grid">
			<N8nInputLabel :label="i18n.baseText('apps.theme.color.primary')" input-name="theme-primary">
				<N8nColorPicker
					v-model="form.primary"
					name="theme-primary"
					data-test-id="app-theme-color-primary"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('apps.theme.color.background')"
				input-name="theme-background"
			>
				<N8nColorPicker
					v-model="form.background"
					name="theme-background"
					data-test-id="app-theme-color-background"
				/>
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('apps.theme.color.surface')" input-name="theme-surface">
				<N8nColorPicker
					v-model="form.surface"
					name="theme-surface"
					data-test-id="app-theme-color-surface"
				/>
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('apps.theme.color.text')" input-name="theme-text">
				<N8nColorPicker v-model="form.text" name="theme-text" data-test-id="app-theme-color-text" />
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('apps.theme.color.muted')" input-name="theme-muted">
				<N8nColorPicker
					v-model="form.muted"
					name="theme-muted"
					data-test-id="app-theme-color-muted"
				/>
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('apps.theme.radius')" input-name="theme-radius">
				<N8nSelect v-model="form.radius" clearable data-test-id="app-theme-radius">
					<N8nOption
						v-for="option in RADIUS_OPTIONS"
						:key="option"
						:value="option"
						:label="option"
					/>
				</N8nSelect>
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('apps.theme.fontFamily')" input-name="theme-font-family">
				<N8nInput
					v-model="form.fontFamily"
					name="theme-font-family"
					data-test-id="app-theme-font-family"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('apps.theme.contentWidth')"
				input-name="theme-content-width"
			>
				<N8nInput
					v-model="form.contentWidth"
					name="theme-content-width"
					:placeholder="i18n.baseText('apps.theme.contentWidth.placeholder')"
					data-test-id="app-theme-content-width"
				/>
			</N8nInputLabel>
		</div>
		<N8nInputLabel :label="i18n.baseText('apps.theme.customCss')" input-name="theme-custom-css">
			<N8nInput
				v-model="form.customCss"
				type="textarea"
				:rows="10"
				size="medium"
				name="theme-custom-css"
				:class="$style.customCss"
				data-test-id="app-theme-custom-css"
			/>
			<N8nText size="small" color="text-light" tag="p">
				{{ i18n.baseText('apps.theme.customCss.hint') }}
			</N8nText>
		</N8nInputLabel>
		<N8nButton :loading="saving" data-test-id="app-theme-save" @click="onSave">
			{{ i18n.baseText('apps.theme.save') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	max-width: 480px;
}

.grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}

.customCss {
	margin-bottom: var(--spacing--2xs);

	textarea {
		font-family: var(--font-family--monospace);
	}
}
</style>
