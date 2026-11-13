<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { SkillSourceCredentialOption, SkillSourceListItem } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInputLabel,
	N8nSelect2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import { useSkillsStore } from '../skills.store';
import { useSkillSourceReasons } from '../skills.utils';

const props = defineProps<{ source: SkillSourceListItem }>();
const emit = defineEmits<{ close: []; replaced: [] }>();
const i18n = useI18n();
const store = useSkillsStore();
const { showError, showMessage } = useToast();
const { reasonText } = useSkillSourceReasons();
const credentials = ref<SkillSourceCredentialOption[]>([]);
const credentialId = ref('');
const loading = ref(true);
const saving = ref(false);
const errorText = ref('');
const items = computed(() => credentials.value.map(({ id, name }) => ({ value: id, label: name })));

onMounted(async () => {
	try {
		credentials.value = await store.fetchReplacementCredentials(props.source);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.connect.credential.error.load'));
	} finally {
		loading.value = false;
	}
});

async function replace() {
	if (saving.value || !credentialId.value || !props.source.canReplaceCredential) return;
	saving.value = true;
	errorText.value = '';
	try {
		await store.replaceSourceCredential(props.source, credentialId.value);
		showMessage({
			title: i18n.baseText('settings.context.skills.sources.replaceCredential.success'),
			type: 'success',
		});
		emit('replaced');
	} catch (error) {
		const reason = error instanceof ResponseError ? error.meta?.reason : undefined;
		errorText.value = reason
			? reasonText(reason, undefined, { withCredential: true })
			: i18n.baseText('settings.context.skills.sources.replaceCredential.error');
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<N8nDialog
		open
		:header="i18n.baseText('settings.context.skills.sources.replaceCredential.action')"
		data-test-id="skill-source-credential-dialog"
		@update:open="!$event && !saving && emit('close')"
	>
		<N8nDialogBody>
			<form id="replace-source-credential" :class="$style.form" @submit.prevent="replace">
				<N8nText tag="p">{{
					i18n.baseText('settings.context.skills.sources.replaceCredential.message', {
						interpolate: { source: source.label },
					})
				}}</N8nText>
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.credential.label')"
					input-name="source-replacement-credential"
				>
					<N8nSelect2
						id="source-replacement-credential"
						:model-value="credentialId"
						:items="items"
						:disabled="loading || saving"
						:placeholder="
							i18n.baseText('settings.context.skills.sources.replaceCredential.placeholder')
						"
						data-test-id="skill-source-credential-select"
						@update:model-value="credentialId = typeof $event === 'string' ? $event : ''"
					/>
				</N8nInputLabel>
				<N8nText v-if="!loading && !credentials.length" tag="p">{{
					i18n.baseText('settings.context.skills.sources.replaceCredential.empty')
				}}</N8nText>
				<N8nText v-if="errorText" role="alert" color="danger">{{ errorText }}</N8nText>
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="outline" :disabled="saving" @click="emit('close')">{{
				i18n.baseText('generic.cancel')
			}}</N8nButton>
			<N8nButton
				type="submit"
				form="replace-source-credential"
				:disabled="loading || !credentialId"
				:loading="saving"
				data-test-id="skill-source-credential-save"
				data-attr="skill-source-credential-save"
				>{{ i18n.baseText('settings.context.skills.sources.replaceCredential.action') }}</N8nButton
			>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
