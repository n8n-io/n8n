<script setup lang="ts">
import {
	UpdatePromotionSettingsDto,
	type PromotionRequireApproval,
	type PromotionSettings,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nSelect2, N8nSettingsRow, N8nSettingsRowGroup } from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { PromotionProjectAccess } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import { getPromotionSettings, updatePromotionSettings } from '../promotions.api';

type PromotionSetting = keyof PromotionSettings;

const props = defineProps<{
	settings: readonly PromotionSetting[];
}>();

const SETTING_TEXT: Record<PromotionSetting, { title: BaseTextKey; description: BaseTextKey }> = {
	whoCanPromote: {
		title: 'settings.promotions.projectAccess.whoCanPromote.title',
		description: 'settings.promotions.projectAccess.whoCanPromote.description',
	},
	whoCanApprove: {
		title: 'settings.promotions.projectAccess.whoCanApprove.title',
		description: 'settings.promotions.projectAccess.whoCanApprove.description',
	},
	whoCanApply: {
		title: 'settings.promotions.projectAccess.whoCanApply.title',
		description: 'settings.promotions.projectAccess.whoCanApply.description',
	},
	requireApproval: {
		title: 'settings.promotions.reviews.requireApproval.title',
		description: 'settings.promotions.reviews.requireApproval.description',
	},
};

const ACCESS_LABEL: Record<PromotionProjectAccess, BaseTextKey> = {
	instanceAdmins: 'settings.promotions.projectAccess.option.instanceAdmins',
	projectAdmins: 'settings.promotions.projectAccess.option.projectAdmins',
	projectAdminsAndEditors: 'settings.promotions.projectAccess.option.projectAdminsAndEditors',
};

const REQUIRE_APPROVAL_LABEL: Record<PromotionRequireApproval, BaseTextKey> = {
	whenConfigured: 'settings.promotions.reviews.requireApproval.option.whenConfigured',
	alwaysRequired: 'settings.promotions.reviews.requireApproval.option.alwaysRequired',
};

const OPTION_LABEL: Record<PromotionSetting, Record<string, BaseTextKey>> = {
	whoCanPromote: ACCESS_LABEL,
	whoCanApprove: ACCESS_LABEL,
	whoCanApply: ACCESS_LABEL,
	requireApproval: REQUIRE_APPROVAL_LABEL,
};

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

// Stays empty when loading fails, so the selects never show a guessed value as saved.
const values = ref<PromotionSettings>();
const saving = ref(false);
const disabled = computed(() => !values.value || saving.value);

const optionsOf = (setting: PromotionSetting): Array<SelectOptionBase<string>> =>
	Object.entries(OPTION_LABEL[setting]).map(([value, label]) => ({
		value,
		label: i18n.baseText(label),
	}));

onMounted(async () => {
	try {
		values.value = await getPromotionSettings(rootStore.publicApiContext);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.projectAccess.toast.error.load'), {
			message: i18n.baseText('settings.promotions.projectAccess.toast.error.description'),
		});
	}
});

async function save(setting: PromotionSetting, selected: SelectValue | undefined) {
	if (!values.value || selected === undefined || selected === values.value[setting]) return;
	const parsed = UpdatePromotionSettingsDto.safeParse({ [setting]: selected });
	if (!parsed.success) return;
	const change = parsed.data;

	const previous = values.value;
	values.value = { ...previous, ...change };
	saving.value = true;
	try {
		values.value = await updatePromotionSettings(rootStore.publicApiContext, change);
		toast.showMessage({
			title: i18n.baseText('settings.promotions.projectAccess.toast.saved'),
			type: 'success',
		});
	} catch (error) {
		// The server can save the settings and still fail later, so show what it stored.
		values.value = await getPromotionSettings(rootStore.publicApiContext).catch(() => previous);
		toast.showError(error, i18n.baseText('settings.promotions.projectAccess.toast.error.save'), {
			message: i18n.baseText('settings.promotions.projectAccess.toast.error.description'),
		});
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<N8nSettingsRowGroup>
		<N8nSettingsRow
			v-for="setting in props.settings"
			:key="setting"
			:title="i18n.baseText(SETTING_TEXT[setting].title)"
			:description="i18n.baseText(SETTING_TEXT[setting].description)"
		>
			<template #action>
				<N8nSelect2
					:model-value="values?.[setting]"
					:items="optionsOf(setting)"
					size="medium"
					:disabled="disabled"
					:aria-label="i18n.baseText(SETTING_TEXT[setting].title)"
					:data-test-id="`promotion-setting-${setting}`"
					@update:model-value="(selected) => save(setting, selected)"
				/>
			</template>
		</N8nSettingsRow>
	</N8nSettingsRowGroup>
</template>
