<script setup lang="ts">
import type { PromotionSettings } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nSelect2, N8nSettingsRow, N8nSettingsRowGroup } from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	promotionProjectAccessSchema,
	type PromotionProjectAccess,
	type PromotionProjectAccessSetting,
} from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import { getPromotionSettings, updatePromotionSettings } from '../promotions.api';

const props = defineProps<{
	settings: readonly PromotionProjectAccessSetting[];
}>();

const SETTING_TEXT: Record<
	PromotionProjectAccessSetting,
	{ title: BaseTextKey; description: BaseTextKey }
> = {
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
};

const OPTION_LABEL: Record<PromotionProjectAccess, BaseTextKey> = {
	instanceAdmins: 'settings.promotions.projectAccess.option.instanceAdmins',
	projectAdmins: 'settings.promotions.projectAccess.option.projectAdmins',
	projectAdminsAndEditors: 'settings.promotions.projectAccess.option.projectAdminsAndEditors',
};

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

// Stays empty when loading fails, so the selects never show a guessed value as saved.
const values = ref<PromotionSettings>();
const saving = ref(false);
const disabled = computed(() => !values.value || saving.value);

const options = computed<Array<SelectOptionBase<PromotionProjectAccess>>>(() =>
	promotionProjectAccessSchema.options.map((value) => ({
		value,
		label: i18n.baseText(OPTION_LABEL[value]),
	})),
);

onMounted(async () => {
	try {
		values.value = await getPromotionSettings(rootStore.publicApiContext);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.projectAccess.toast.error.load'), {
			message: i18n.baseText('settings.promotions.projectAccess.toast.error.description'),
		});
	}
});

async function save(setting: PromotionProjectAccessSetting, selected: SelectValue | undefined) {
	const parsed = promotionProjectAccessSchema.safeParse(selected);
	if (!values.value || !parsed.success || parsed.data === values.value[setting]) return;

	const previous = values.value;
	values.value = { ...previous, [setting]: parsed.data };
	saving.value = true;
	try {
		values.value = await updatePromotionSettings(rootStore.publicApiContext, {
			[setting]: parsed.data,
		});
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
					:items="options"
					size="medium"
					:disabled="disabled"
					:aria-label="i18n.baseText(SETTING_TEXT[setting].title)"
					:data-test-id="`promotion-project-access-${setting}`"
					@update:model-value="(selected) => save(setting, selected)"
				/>
			</template>
		</N8nSettingsRow>
	</N8nSettingsRowGroup>
</template>
