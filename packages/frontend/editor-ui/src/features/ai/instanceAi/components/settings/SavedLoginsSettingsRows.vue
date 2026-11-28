<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { instanceAiSavedLoginsModeSchema, type InstanceAiSavedLoginsMode } from '@n8n/api-types';
import {
	N8nButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nSettingsRow,
	N8nText,
} from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

const props = defineProps<{
	/** The virtual browser is off, so the rules cannot change. */
	disabled: boolean;
}>();

const i18n = useI18n();
const message = useMessage();
const store = useInstanceAiSettingsStore();

const SAVED_LOGINS_MODE_LABEL: Record<InstanceAiSavedLoginsMode, BaseTextKey> = {
	off: 'settings.n8nAgent.savedLogins.mode.off',
	all: 'settings.n8nAgent.savedLogins.mode.all',
	only: 'settings.n8nAgent.savedLogins.mode.only',
	except: 'settings.n8nAgent.savedLogins.mode.except',
};

const savedLoginsMode = computed(
	(): InstanceAiSavedLoginsMode => store.settings?.cloudBrowserSavedLoginsMode ?? 'off',
);
const showSavedLoginSites = computed(
	() => !props.disabled && (savedLoginsMode.value === 'only' || savedLoginsMode.value === 'except'),
);
const savedLoginSitesLabel = computed(() =>
	i18n.baseText(
		savedLoginsMode.value === 'except'
			? 'settings.n8nAgent.savedLogins.sites.blockedLabel'
			: 'settings.n8nAgent.savedLogins.sites.allowedLabel',
	),
);

const savedLoginSitesText = ref('');
const storedSavedLoginSitesText = computed(() =>
	(store.settings?.cloudBrowserSavedLoginSites ?? []).join('\n'),
);
// Watch the text, not the array, so a save of another setting keeps the unsaved sites.
watch(
	storedSavedLoginSitesText,
	(storedText) => {
		savedLoginSitesText.value = storedText;
	},
	{ immediate: true },
);

const enteredSavedLoginSites = computed(() =>
	savedLoginSitesText.value.split(/[\s,]+/).filter(Boolean),
);
const hasUnsavedLoginSites = computed(
	() =>
		enteredSavedLoginSites.value.join(',') !==
		(store.settings?.cloudBrowserSavedLoginSites ?? []).join(','),
);

async function handleSavedLoginsModeChange(value: InstanceAiSavedLoginsMode) {
	if (!(await confirmClearingSavedLoginSites(value))) return;
	store.setField('cloudBrowserSavedLoginsMode', value);
	if (!(await store.save())) return;
	// The server deleted the list. Also remove the sites that were typed and not saved.
	savedLoginSitesText.value = '';
}

/** A mode change deletes the list of sites, so ask first when it has sites. */
async function confirmClearingSavedLoginSites(
	newMode: InstanceAiSavedLoginsMode,
): Promise<boolean> {
	const count = enteredSavedLoginSites.value.length;
	if (count === 0) return true;
	let descriptionKey: BaseTextKey = 'settings.n8nAgent.savedLogins.clearSites.allowedDescription';
	if (savedLoginsMode.value === 'except') {
		descriptionKey = 'settings.n8nAgent.savedLogins.clearSites.blockedDescription';
	}
	const currentOption = i18n.baseText(SAVED_LOGINS_MODE_LABEL[savedLoginsMode.value]);
	const newOption = i18n.baseText(SAVED_LOGINS_MODE_LABEL[newMode]);
	const confirmed = await message.confirm(
		i18n.baseText(descriptionKey, {
			adjustToNumber: count,
			interpolate: { count: String(count), option: currentOption },
		}),
		{
			title: i18n.baseText('settings.n8nAgent.savedLogins.clearSites.title', {
				interpolate: { option: newOption },
			}),
			confirmButtonText: i18n.baseText('settings.n8nAgent.savedLogins.clearSites.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	return confirmed === MODAL_CONFIRM;
}

/** Why the server rejected the list. */
const savedLoginSitesError = ref<string>();
watch(savedLoginSitesText, () => {
	savedLoginSitesError.value = undefined;
});

async function saveSavedLoginSites() {
	store.setField('cloudBrowserSavedLoginSites', enteredSavedLoginSites.value);
	if (await store.save()) return;
	savedLoginSitesError.value = invalidSitesMessage(store.lastSaveError);
}

onBeforeRouteLeave(async (_to, _from, next) => {
	if (!hasUnsavedLoginSites.value) {
		next();
		return;
	}

	const response = await message.confirm(
		i18n.baseText('generic.unsavedWork.confirmMessage.message'),
		{
			title: i18n.baseText('generic.unsavedWork.confirmMessage.headline'),
			type: 'warning',
			confirmButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
			cancelButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
			showClose: true,
		},
	);

	if (response === MODAL_CONFIRM) {
		// Stay on the page when the save fails, so the admin sees the error.
		await saveSavedLoginSites();
		next(!hasUnsavedLoginSites.value);
		return;
	}

	if (response === MODAL_CANCEL) {
		next();
		return;
	}

	next(false);
});

/** The message for the sites that the server could not read. Nothing for any other error. */
function invalidSitesMessage(error: unknown): string | undefined {
	if (!(error instanceof ResponseError)) return undefined;
	const invalidSites = error.meta?.invalidSites;
	if (!Array.isArray(invalidSites)) return undefined;
	const sites = invalidSites.map((site) => `"${String(site)}"`).join(', ');
	return i18n.baseText('settings.n8nAgent.savedLogins.sites.invalid', { interpolate: { sites } });
}
</script>

<template>
	<!-- The row group hides only a direct last row's divider, so these rows set their own. -->
	<div :class="$style.rows">
		<N8nSettingsRow
			:class="{ [$style.dim]: disabled }"
			:show-divider="showSavedLoginSites"
			:title="i18n.baseText('settings.n8nAgent.savedLogins.label')"
			:description="i18n.baseText('settings.n8nAgent.savedLogins.description')"
		>
			<template #action>
				<N8nSelect
					:class="$style.modeSelect"
					:model-value="savedLoginsMode"
					size="small"
					:disabled="store.isSaving || disabled"
					:aria-label="i18n.baseText('settings.n8nAgent.savedLogins.label')"
					data-test-id="n8n-agent-saved-logins-mode"
					@update:model-value="handleSavedLoginsModeChange($event as InstanceAiSavedLoginsMode)"
				>
					<N8nOption
						v-for="mode in instanceAiSavedLoginsModeSchema.options"
						:key="mode"
						:value="mode"
						:label="i18n.baseText(SAVED_LOGINS_MODE_LABEL[mode])"
					/>
				</N8nSelect>
			</template>
		</N8nSettingsRow>

		<N8nSettingsRow v-if="showSavedLoginSites" layout="custom" :show-divider="false">
			<div :class="$style.sites">
				<N8nText tag="label" for="n8n-agent-saved-login-sites" size="small" bold>
					{{ savedLoginSitesLabel }}
				</N8nText>
				<N8nInput
					v-model="savedLoginSitesText"
					type="textarea"
					:rows="5"
					:placeholder="i18n.baseText('settings.n8nAgent.savedLogins.sites.placeholder')"
					id="n8n-agent-saved-login-sites"
					:disabled="store.isSaving"
					data-test-id="n8n-agent-saved-login-sites"
				/>
				<N8nText
					v-if="savedLoginSitesError"
					size="small"
					color="danger"
					data-test-id="n8n-agent-saved-login-sites-error"
				>
					{{ savedLoginSitesError }}
				</N8nText>
				<div :class="$style.sitesFooter">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.n8nAgent.savedLogins.sites.hint') }}
					</N8nText>
					<N8nButton
						v-if="hasUnsavedLoginSites"
						variant="solid"
						size="small"
						:label="i18n.baseText('generic.save')"
						:disabled="store.isSaving"
						data-test-id="n8n-agent-saved-login-sites-save"
						@click="saveSavedLoginSites"
					/>
				</div>
			</div>
		</N8nSettingsRow>
	</div>
</template>

<style lang="scss" module>
.rows {
	display: flex;
	flex-direction: column;
}

.dim {
	opacity: 0.5;
	pointer-events: none;
}

.modeSelect {
	width: 11rem;
}

.sites {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
}

.sitesFooter {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
}
</style>
