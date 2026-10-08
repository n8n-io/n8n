<script lang="ts" setup="">
import { computed, ref } from 'vue';
import type { Validatable, IValidator } from '@n8n/design-system';
import { VALID_EMAIL_REGEX } from '@/app/constants';
import { COMMUNITY_PLUS_DOCS_URL } from '../usage.constants';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useUsageStore } from '../usage.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useUsersStore } from '@n8n/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nFormInput,
	N8nText,
} from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data?: {
		closeCallback?: () => void;
		customHeading?: string;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const usageStore = useUsageStore();
const telemetry = useTelemetry();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const isLoading = ref(false);
const valid = ref(false);
const email = ref(usersStore.currentUser?.email ?? '');
const validationRules = ref([{ name: 'email' }]);
const validators = ref<{ [key: string]: IValidator }>({
	email: {
		validate: (value: Validatable) => {
			if (typeof value !== 'string') {
				return false;
			}

			if (!VALID_EMAIL_REGEX.test(value)) {
				return {
					message: 'settings.users.invalidEmailError',
					options: { interpolate: { email: value } },
				};
			}

			return false;
		},
	},
});

function closeDialog() {
	if (uiStore.modalsById[props.modalName]?.open !== true) return;
	telemetry.track('User skipped community plus');
	uiStore.closeModal(props.modalName);
	props.data?.closeCallback?.();
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

const confirm = async () => {
	if (!valid.value || isLoading.value) {
		return;
	}

	isLoading.value = true;
	try {
		const { title, text } = await usageStore.registerCommunityEdition(email.value);
		closeDialog();
		toast.showMessage({
			title: title ?? i18n.baseText('communityPlusModal.success.title'),
			message:
				text ??
				i18n.baseText('communityPlusModal.success.message', {
					interpolate: { email: email.value },
				}),
			type: 'success',
			duration: 0,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('communityPlusModal.error.title'));
	} finally {
		isLoading.value = false;
	}
};
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:aria-label="data?.customHeading ?? i18n.baseText('communityPlusModal.title')"
		:show-close-button="false"
		:close-on-overlay-click="false"
		:close-on-escape="false"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ data?.customHeading ?? i18n.baseText('communityPlusModal.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :data-test-id="`${modalName}-modal`">
				<div>
					<N8nText tag="p">{{ i18n.baseText('communityPlusModal.description') }}</N8nText>
					<ul :class="$style.features">
						<li>
							<i>🐞</i>
							<N8nText>
								<strong>{{ i18n.baseText('communityPlusModal.features.debugging.title') }}</strong>
								{{ i18n.baseText('communityPlusModal.features.debugging.description') }}
							</N8nText>
						</li>
						<li>
							<i>🔎</i>
							<N8nText>
								<strong>{{ i18n.baseText('communityPlusModal.features.execution.title') }}</strong>
								{{ i18n.baseText('communityPlusModal.features.execution.description') }}
							</N8nText>
						</li>
						<li>
							<i> 📁</i>
							<N8nText>
								<strong>{{ i18n.baseText('communityPlusModal.features.folders.title') }}</strong>
								{{ i18n.baseText('communityPlusModal.features.folders.description') }}
							</N8nText>
						</li>
					</ul>
					<N8nFormInput
						id="email"
						v-model="email"
						:label="i18n.baseText('communityPlusModal.input.email.label')"
						type="email"
						name="email"
						label-size="small"
						tag-size="small"
						required
						:show-required-asterisk="true"
						:validate-on-blur="false"
						:validation-rules="validationRules"
						:validators="validators"
						@validate="valid = $event"
						@keyup.enter="confirm"
					/>
				</div>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<div :class="$style.notice">
					<N8nText size="xsmall" tag="span">
						{{ i18n.baseText('communityPlusModal.notice') }}
						<a :href="COMMUNITY_PLUS_DOCS_URL" target="_blank">
							{{ i18n.baseText('generic.moreInfo') }}
						</a>
					</N8nText>
				</div>
				<div :class="$style.buttons">
					<N8nButton
						variant="ghost"
						:class="$style.skip"
						:disabled="isLoading"
						@click="closeDialog"
						>{{ i18n.baseText('communityPlusModal.button.skip') }}</N8nButton
					>
					<N8nButton :disabled="!valid || isLoading" variant="solid" @click="confirm">
						{{ i18n.baseText('communityPlusModal.button.confirm') }}
					</N8nButton>
				</div>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.footer {
	width: 100%;
}

.notice {
	margin-bottom: var(--spacing--lg);
}

.features {
	padding: var(--spacing--sm) var(--spacing--lg) 0;
	list-style: none;

	li {
		display: flex;
		padding: 0 var(--spacing--sm) var(--spacing--md) 0;

		i {
			display: inline-block;
			margin: var(--spacing--5xs) var(--spacing--xs) 0 0;
			font-style: normal;
			font-size: var(--font-size--sm);
		}

		strong {
			display: block;
			margin-bottom: var(--spacing--4xs);
		}
	}
}

.buttons {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
</style>
