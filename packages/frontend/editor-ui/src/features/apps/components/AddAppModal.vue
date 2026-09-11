<script setup lang="ts">
import { N8nButton, N8nFormInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { APP_LAYOUT_PRESETS, type AppLayoutPresetId } from '@n8n/api-types';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import Modal from '@/app/components/Modal.vue';
import type { Rule, RuleGroup } from '@/Interface';
import landingPreview from '@/features/apps/assets/presets/landing.png';
import minimalPreview from '@/features/apps/assets/presets/minimal.png';
import sidebarPreview from '@/features/apps/assets/presets/sidebar.png';
import topNavPreview from '@/features/apps/assets/presets/top-nav.png';
import { useAppsStore } from '@/features/apps/apps.store';
import { APP_DETAILS } from '@/features/apps/apps.constants';
import { useUIStore } from '@/app/stores/ui.store';

/** Screenshots of a sample app served with each preset (scratchpad `preset-screenshots.mjs`). */
const PRESET_PREVIEWS: Record<AppLayoutPresetId, string> = {
	'top-nav': topNavPreview,
	sidebar: sidebarPreview,
	landing: landingPreview,
	minimal: minimalPreview,
};

type AddAppModalData = { projectId: string };

const props = defineProps<{
	modalName: string;
	data: AddAppModalData;
}>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const appsStore = useAppsStore();

// Mirrors `appNameSchema` / `appNamespaceSchema` in @n8n/api-types: at most
// 128 characters; the namespace is lowercase, digits, single hyphens.
const APP_NAME_MAX_LENGTH = 128;
const NAMESPACE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const toNamespace = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const nameValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: APP_NAME_MAX_LENGTH } },
];
const namespaceValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: APP_NAME_MAX_LENGTH } },
	{
		name: 'MATCH_REGEX',
		config: {
			regex: NAMESPACE_REGEX,
			message: i18n.baseText('apps.add.input.namespace.error.regex'),
		},
	},
];

const name = ref('');
// Follows the name until the user types into the namespace field.
const editedNamespace = ref<string | null>(null);
const namespace = computed({
	get: () => editedNamespace.value ?? toNamespace(name.value),
	set: (value: string) => {
		editedNamespace.value = value;
	},
});
const layoutPreset = ref<AppLayoutPresetId>('top-nav');
const presetCards = ref<HTMLButtonElement[]>([]);

const selectPreset = (index: number) => {
	const preset = APP_LAYOUT_PRESETS.at(index % APP_LAYOUT_PRESETS.length);
	if (!preset) return;
	layoutPreset.value = preset.id;
	presetCards.value[APP_LAYOUT_PRESETS.indexOf(preset)]?.focus();
};

const onPresetKeydown = (event: KeyboardEvent, index: number) => {
	const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
	if (step === undefined) return;
	event.preventDefault();
	selectPreset(index + step + APP_LAYOUT_PRESETS.length);
};

const isCreating = ref(false);
const formValidation = reactive({ name: false, namespace: false });
const isFormValid = computed(() => formValidation.name && formValidation.namespace);

const namespacePreview = computed(() => `/apps/${namespace.value || '…'}`);

const onSubmit = async () => {
	if (!isFormValid.value || isCreating.value) return;
	isCreating.value = true;
	try {
		const app = await appsStore.createApp(
			props.data.projectId,
			name.value,
			namespace.value,
			layoutPreset.value,
		);
		uiStore.closeModal(props.modalName);
		await router.push({
			name: APP_DETAILS,
			params: { projectId: props.data.projectId, appId: app.id },
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.add.error'));
	} finally {
		isCreating.value = false;
	}
};
</script>

<template>
	<Modal
		:name="props.modalName"
		:center="true"
		width="600px"
		max-height="90vh"
		:scrollable="true"
		data-test-id="add-app-modal"
	>
		<template #header>
			<h2>{{ i18n.baseText('apps.add.title') }}</h2>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nFormInput
					v-model="name"
					:label="i18n.baseText('apps.add.input.name.label')"
					:placeholder="i18n.baseText('apps.add.input.name.placeholder')"
					name="appName"
					required
					focus-initially
					:validation-rules="nameValidationRules"
					data-test-id="apps-new-name"
					@validate="(valid: boolean) => (formValidation.name = valid)"
					@enter="onSubmit"
				/>
				<N8nFormInput
					v-model="namespace"
					:label="i18n.baseText('apps.add.input.namespace.label')"
					:placeholder="i18n.baseText('apps.add.input.namespace.placeholder')"
					:info-text="
						i18n.baseText('apps.add.input.namespace.hint', {
							interpolate: { path: namespacePreview },
						})
					"
					name="appNamespace"
					required
					:validation-rules="namespaceValidationRules"
					data-test-id="apps-new-namespace"
					@validate="(valid: boolean) => (formValidation.namespace = valid)"
					@enter="onSubmit"
				/>
				<N8nInputLabel :label="i18n.baseText('apps.add.preset.label')" input-name="appLayoutPreset">
					<div
						id="appLayoutPreset"
						role="radiogroup"
						:aria-label="i18n.baseText('apps.add.preset.label')"
						:class="$style.presets"
						data-test-id="apps-new-layout-preset"
					>
						<button
							v-for="(preset, index) in APP_LAYOUT_PRESETS"
							:key="preset.id"
							ref="presetCards"
							type="button"
							role="radio"
							:aria-checked="layoutPreset === preset.id"
							:tabindex="layoutPreset === preset.id ? 0 : -1"
							:class="[$style.preset, { [$style.presetSelected]: layoutPreset === preset.id }]"
							:data-test-id="`apps-new-layout-preset-${preset.id}`"
							@click="selectPreset(index)"
							@keydown="onPresetKeydown($event, index)"
						>
							<img
								:src="PRESET_PREVIEWS[preset.id]"
								:alt="preset.name"
								:class="$style.presetImage"
							/>
							<span :class="$style.presetName">{{ preset.name }}</span>
							<span :class="$style.presetDescription">{{ preset.description }}</span>
						</button>
					</div>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="apps-new-cancel"
					@click="uiStore.closeModal(props.modalName)"
				/>
				<N8nButton
					:loading="isCreating"
					:disabled="!isFormValid"
					size="large"
					:label="i18n.baseText('apps.add.button.label')"
					data-test-id="apps-new-submit"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}

.presets {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.preset {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs);
	text-align: left;
	background: var(--background--surface);
	border: 1px solid var(--border-color);
	border-radius: var(--radius--md);
	cursor: pointer;
	color: var(--text-color);

	&:hover {
		border-color: var(--border-color--strong);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.presetSelected,
.presetSelected:hover {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 1px var(--color--primary);
}

.presetImage {
	display: block;
	width: 100%;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	border: 1px solid var(--border-color);
	border-radius: var(--radius--sm);
}

.presetName {
	margin-top: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.presetDescription {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
}
</style>
