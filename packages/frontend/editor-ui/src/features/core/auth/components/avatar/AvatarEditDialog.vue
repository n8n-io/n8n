<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import {
	AVATAR_BACKGROUND_COLORS,
	AVATAR_BACKGROUNDS,
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	type UserAvatarBackground,
} from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { AVATAR_EDIT_MODAL_KEY } from '../../auth.constants';

import AvatarGeneratorPanel, { type GeneratorInputOptions } from './AvatarGeneratorPanel.vue';
import AvatarSourcePicker, {
	type AvatarOrbOption,
	type AvatarSource,
} from './AvatarSourcePicker.vue';
import AvatarStageNote from './AvatarStageNote.vue';
import AvatarUploadPanel from './AvatarUploadPanel.vue';
import {
	DEFAULT_GENERATOR_INPUT,
	GENERATED_AVATAR_VARIANT,
	generatePalette,
	randomSeed,
	type AvatarGeneratorInput,
} from './avatarGenerator';
import {
	AVATAR_MAX_SOURCE_BYTES,
	AvatarImageError,
	cropPreviewStyle,
	decodeAvatarSource,
	probeTransparency,
	renderAvatar,
	type CropState,
	type DecodedAvatarSource,
} from './avatarImage';
import { ssoProviderName } from './ssoProvider';

/**
 * Where a user decides how they appear. A row of orbs shows every picture
 * they can be shown with (the one their identity provider sends, a generated
 * one, an upload); the chosen orb grows, and the controls for it appear
 * underneath, every set of them built to one height so the dialog never resizes.
 */

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });

const i18n = useI18n();
const { showMessage, showError } = useToast();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const currentUser = computed(() => usersStore.currentUser);
const avatar = computed(() => currentUser.value?.avatar ?? null);
const uploadsEnabled = computed(() => settingsStore.userManagement.avatarUploadsEnabled);

const busy = ref(false);

// --- Backdrop -------------------------------------------------------------

/**
 * What shows through a see-through picture. There is no control for it: a
 * picture already on the server keeps the backdrop it was given, and a fresh
 * transparent upload is dealt one at random when it is chosen.
 */
const randomBackground = () =>
	AVATAR_BACKGROUNDS[Math.floor(Math.random() * AVATAR_BACKGROUNDS.length)];
const background = ref<UserAvatarBackground>(avatar.value?.background ?? randomBackground());
const backdropColor = computed(() => AVATAR_BACKGROUND_COLORS[background.value]);

// --- Upload --------------------------------------------------------------

const source = ref<DecodedAvatarSource | null>(null);
const crop = ref<CropState>({ zoom: 1, panX: 0, panY: 0 });

/**
 * Removing the uploaded picture is a change like any other in this dialog:
 * it is only marked here and leaves the server on save, so cancel keeps it.
 */
const removalPending = ref(false);
const storedUpload = computed(() => (removalPending.value ? null : (avatar.value?.upload ?? null)));
const existingUploadUrl = computed(() => storedUpload.value?.url ?? null);

/** Whether the pictures already on the server have see-through pixels; probed on open. */
const storedTransparency = ref<{ upload: boolean; sso: boolean }>({ upload: false, sso: false });

const probeStored = async () => {
	const [upload, sso] = await Promise.all([
		avatar.value?.upload ? probeTransparency(avatar.value.upload.url) : false,
		avatar.value?.sso ? probeTransparency(avatar.value.sso.url) : false,
	]);
	storedTransparency.value = { upload, sso };
};
void probeStored();

const uploadHasTransparency = computed(() =>
	source.value ? source.value.hasTransparency : storedTransparency.value.upload,
);

const discardSource = () => {
	source.value?.revoke();
	source.value = null;
};

const onPick = async (file: File) => {
	try {
		const decoded = await decodeAvatarSource(file);
		discardSource();
		source.value = decoded;
		crop.value = { zoom: 1, panX: 0, panY: 0 };
		if (decoded.hasTransparency) background.value = randomBackground();
	} catch (error) {
		const problem = error instanceof AvatarImageError ? error.problem : 'decode';
		showMessage({
			type: 'error',
			title: i18n.baseText('auth.avatar.upload.error'),
			message: i18n.baseText(`auth.avatar.upload.error.${problem}`, {
				interpolate: { megabytes: Math.round(AVATAR_MAX_SOURCE_BYTES / (1024 * 1024)) },
			}),
		});
	}
};

// --- Generate ------------------------------------------------------------

const saved = computed(() => avatar.value?.generated);

const generatorInput = ref<AvatarGeneratorInput>({
	...DEFAULT_GENERATOR_INPUT,
	...saved.value?.recipe,
	seed: saved.value?.seed ?? randomSeed(),
});
const generatorTouched = ref(false);

// Until the user touches something, the saved palette is shown as-is, so a design made
// elsewhere (without a recipe) still opens looking the way it was saved.
const colors = computed(() =>
	!generatorTouched.value && saved.value
		? saved.value.colors
		: generatePalette(generatorInput.value),
);

// Whether the orb eases into the next arrangement. Set per change: a shuffle or a
// preset is one move worth gliding through, a colour-pad drag is a stream the orb
// must keep up with. The flag stays until the next change decides again, so the
// class and the new artwork land in the same render.
const artworkMorphing = ref(false);

const onGeneratorInput = (value: AvatarGeneratorInput, options: GeneratorInputOptions) => {
	artworkMorphing.value = options.discrete;
	generatorInput.value = value;
	generatorTouched.value = true;
};

const shuffle = () => {
	onGeneratorInput({ ...generatorInput.value, seed: randomSeed() }, { discrete: true });
};

// --- SSO -----------------------------------------------------------------

const ssoProvider = computed(() => ssoProviderName(avatar.value?.sso?.provider));

const ssoHeading = computed(() =>
	ssoProvider.value
		? i18n.baseText('auth.avatar.sso.heading', { interpolate: { provider: ssoProvider.value } })
		: i18n.baseText('auth.avatar.sso.headingUnknown'),
);

const ssoDescription = computed(() =>
	ssoProvider.value
		? i18n.baseText('auth.avatar.sso.description', {
				interpolate: { provider: ssoProvider.value },
			})
		: i18n.baseText('auth.avatar.sso.descriptionUnknown'),
);

// --- Orbs ----------------------------------------------------------------

const orbs = computed<AvatarOrbOption[]>(() => {
	const options: AvatarOrbOption[] = [];

	if (avatar.value?.sso) {
		options.push({
			value: 'sso',
			label: ssoProvider.value
				? i18n.baseText('auth.avatar.source.ssoProvider', {
						interpolate: { provider: ssoProvider.value },
					})
				: i18n.baseText('auth.avatar.source.sso'),
			face: {
				kind: 'image',
				url: avatar.value.sso.url,
				backdrop: storedTransparency.value.sso ? backdropColor.value : undefined,
			},
		});
	}

	options.push({
		value: 'generated',
		label: i18n.baseText('auth.avatar.source.generated'),
		face: {
			kind: 'generated',
			variant: GENERATED_AVATAR_VARIANT,
			seed: generatorInput.value.seed,
			colors: colors.value,
			firstName: currentUser.value?.firstName,
			lastName: currentUser.value?.lastName,
			morphing: artworkMorphing.value,
		},
	});

	if (uploadsEnabled.value || storedUpload.value) {
		let face: AvatarOrbOption['face'] = { kind: 'empty' };
		if (source.value) {
			face = {
				kind: 'crop',
				url: source.value.previewUrl,
				style: cropPreviewStyle(source.value, crop.value),
				backdrop: source.value.hasTransparency ? backdropColor.value : undefined,
			};
		} else if (existingUploadUrl.value) {
			face = {
				kind: 'image',
				url: existingUploadUrl.value,
				backdrop: storedTransparency.value.upload ? backdropColor.value : undefined,
			};
		}
		options.push({ value: 'upload', label: i18n.baseText('auth.avatar.source.upload'), face });
	}

	return options;
});

const initialSelection = (): AvatarSource => {
	const shown = avatar.value?.source;
	if (shown && orbs.value.some((orb) => orb.value === shown)) return shown;
	return 'generated';
};
const selection = ref<AvatarSource>(initialSelection());

// A removal can take an orb away (the last upload, when uploads are off).
watch(orbs, (options) => {
	if (!options.some((option) => option.value === selection.value)) selection.value = 'generated';
});

const removeUpload = () => {
	if (busy.value) return;
	removalPending.value = true;
	// The picture being removed can't stay the one shown, so move to one that can.
	if (selection.value === 'upload') selection.value = avatar.value?.sso ? 'sso' : 'generated';
};

// --- Save ----------------------------------------------------------------

// Only the upload orb can be picked with nothing behind it yet.
const canSave = computed(
	() => !busy.value && (selection.value !== 'upload' || !!source.value || !!storedUpload.value),
);

// Saving the picture that is already shown, untouched, is just a way to close.
const hasChanges = computed(() => {
	if (removalPending.value) return true;
	const shown = avatar.value?.source;
	switch (selection.value) {
		case 'upload':
			return !!source.value || shown !== 'upload';
		case 'generated':
			return shown !== 'generated' || generatorTouched.value;
		case 'sso':
			return shown !== 'sso';
	}
	return false;
});

const close = () => {
	if (busy.value) return;
	uiStore.closeModal(AVATAR_EDIT_MODAL_KEY);
};

const onOpenChange = (open: boolean) => {
	if (!open) close();
};

const save = async () => {
	if (!canSave.value) return;
	if (!hasChanges.value) {
		close();
		return;
	}
	busy.value = true;
	try {
		// A fresh upload replaces the stored picture, so only the other choices need it removed.
		if (removalPending.value && !(selection.value === 'upload' && source.value)) {
			await usersStore.deleteCurrentUserAvatar('upload');
		}
		removalPending.value = false;

		if (selection.value === 'upload') {
			if (source.value) {
				const rendered = await renderAvatar(source.value, crop.value);
				await usersStore.uploadCurrentUserAvatar(rendered.blob, {
					fileName: rendered.fileName,
					background: source.value.hasTransparency ? background.value : undefined,
				});
			} else {
				await usersStore.updateCurrentUserAvatar({ source: 'upload' });
			}
		} else if (selection.value === 'generated') {
			const { seed, hue, tone } = generatorInput.value;
			await usersStore.updateCurrentUserAvatar({
				source: 'generated',
				generated: {
					variant: GENERATED_AVATAR_VARIANT,
					seed,
					colors: colors.value,
					recipe: { hue: Math.round(hue), tone: Math.round(tone) },
				},
			});
		} else {
			await usersStore.updateCurrentUserAvatar({ source: 'sso' });
		}
	} catch (error) {
		showError(error, i18n.baseText('auth.avatar.error'));
		return;
	} finally {
		busy.value = false;
	}

	showMessage({ type: 'success', title: i18n.baseText('auth.avatar.saved') });
	close();
};

onBeforeUnmount(discardSource);
</script>

<template>
	<N8nDialog
		:open="true"
		:header="i18n.baseText('auth.avatar.title')"
		:aria-description="i18n.baseText('auth.avatar.description')"
		size="medium"
		@update:open="onOpenChange"
	>
		<N8nDialogBody>
			<div :class="$style.layout" data-test-id="avatar-edit-dialog">
				<AvatarSourcePicker
					:model-value="selection"
					:options="orbs"
					:label="i18n.baseText('auth.avatar.source.ariaLabel')"
					:disabled="busy"
					@update:model-value="selection = $event"
				/>

				<div :class="$style.stage" data-test-id="avatar-stage">
					<div :key="selection" :class="$style.stageContent">
						<AvatarUploadPanel
							v-if="selection === 'upload'"
							:source="source"
							:crop="crop"
							:existing-url="existingUploadUrl"
							:background="background"
							:has-transparency="uploadHasTransparency"
							:uploads-enabled="uploadsEnabled"
							:busy="busy"
							@pick="onPick"
							@remove="removeUpload"
							@update:crop="crop = $event"
						/>

						<AvatarGeneratorPanel
							v-else-if="selection === 'generated'"
							:model-value="generatorInput"
							:busy="busy"
							@update:model-value="onGeneratorInput"
							@shuffle="shuffle"
						/>

						<AvatarStageNote
							v-else
							:heading="ssoHeading"
							:description="ssoDescription"
							data-test-id="avatar-sso-panel"
						/>
					</div>
				</div>
			</div>
		</N8nDialogBody>

		<N8nDialogFooter>
			<N8nButton variant="outline" :disabled="busy" data-test-id="avatar-cancel" @click="close">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton :disabled="!canSave" :loading="busy" data-test-id="avatar-save" @click="save">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.layout {
	/*
	 * A shuffle is one choreographed move, shared by the orb (AvatarSourcePicker)
	 * and the button's icon (AvatarGeneratorPanel): the icon turns once while the
	 * artwork glides into its new arrangement. The blobs can swing most of a
	 * turn, so the move gets half a beat more than base, eased in and out, to
	 * read as a glide rather than a snap.
	 */
	--avatar-morph--duration: calc(var(--duration--base) * 1.5);
	--avatar-morph--easing: var(--easing--ease-in-out);

	/*
	 * The generator panel's natural height (its colour field plus the presets
	 * row). Every other state, framing an upload included, is built to this
	 * height, so the dialog keeps one size whichever orb or step is shown.
	 */
	--avatar-stage--min-height: 172px;

	/*
	 * The dialog's own background, which is not the plain surface in the dark
	 * theme. Selection rings leave a gap in this color, so the gap reads as the
	 * dialog showing through rather than as a second ring.
	 */
	--avatar-dialog--surface: light-dark(var(--background--surface), var(--background--subtle));

	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--2xs);
	/* With the footer's own `md` margin this puts `xl` between the controls and the actions. */
	padding-bottom: var(--spacing--xs);
}

/* Each state rises a few pixels as it comes in; the clip keeps that inside the stage. */
.stage {
	position: relative;
	overflow: hidden;
	/* Room for focus rings at the edges, taken back from the layout. */
	margin: calc(-1 * var(--spacing--4xs));
}

.stageContent {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--4xs);

	@include motion.fade-in-up;
}
</style>
