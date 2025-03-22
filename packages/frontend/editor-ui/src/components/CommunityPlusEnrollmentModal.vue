<script lang="ts" setup="">
import { ref } from 'vue';
import { createEventBus } from '@n8n/utils/event-bus';
import type { Validatable, IValidator } from '@n8n/design-system';
import { N8nFormInput } from '@n8n/design-system';
import { VALID_EMAIL_REGEX } from '@/constants';
import Modal from '@/components/Modal.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useUsageStore } from '@/stores/usage.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUsersStore } from '@/stores/users.store';

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

const modalBus = createEventBus();

const closeModal = () => {
	telemetry.track('User skipped community plus');
	modalBus.emit('close');
	props.data?.closeCallback?.();
};

const confirm = async () => {
	try {
		const { title, text } = await usageStore.registerCommunityEdition(email.value);
		closeModal();
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
	}
};
</script>

<template>
	<Modal
		width="500px"
		:name="props.modalName"
		:event-bus="modalBus"
		:show-close="false"
		:close-on-click-modal="false"
		:close-on-press-escape="false"
	>
		<template #content>
			<div>
				<p :class="$style.top">
					<N8nBadge>{{ i18n.baseText('communityPlusModal.badge') }}</N8nBadge>
				</p>
				<N8nText tag="h1" align="center" size="xlarge" class="mb-m">{{
					data?.customHeading ?? i18n.baseText('communityPlusModal.title')
				}}</N8nText>
				<N8nText tag="p">{{ i18n.baseText('communityPlusModal.description') }}</N8nText>
				<ul :class="$style.features">
					<li>
						<i>🕰️</i>
						<N8nText>
							<strong>{{ i18n.baseText('communityPlusModal.features.first.title') }}</strong>
							{{ i18n.baseText('communityPlusModal.features.first.description') }}
						</N8nText>
					</li>
					<li>
						<i>🐞</i>
						<N8nText>
							<strong>{{ i18n.baseText('communityPlusModal.features.second.title') }}</strong>
							{{ i18n.baseText('communityPlusModal.features.second.description') }}
						</N8nText>
					</li>
					<li>
						<i>🔎</i>
						<N8nText>
							<strong>{{ i18n.baseText('communityPlusModal.features.third.title') }}</strong>
							{{ i18n.baseText('communityPlusModal.features.third.description') }}
						</N8nText>
					</li>
					<li>
						<i> 📁</i>
						<N8nText>
							<strong>{{ i18n.baseText('communityPlusModal.features.fourth.title') }}</strong>
							{{ i18n.baseText('communityPlusModal.features.fourth.description') }}
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
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton :class="$style.skip" type="secondary" text @click="closeModal">{{
					i18n.baseText('communityPlusModal.button.skip')
				}}</N8nButton>
				<N8nButton :disabled="!valid" type="primary" @click="confirm">
					{{ i18n.baseText('communityPlusModal.button.confirm') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.top {
	display: flex;
	justify-content: center;
	margin: 0 0 var(--spacing-s);
}

.features {
	padding: var(--spacing-s) var(--spacing-l) 0;
	list-style: none;

	li {
		display: flex;
		padding: 0 var(--spacing-s) var(--spacing-m) 0;

		i {
			display: inline-block;
			margin: var(--spacing-5xs) var(--spacing-xs) 0 0;
			font-style: normal;
			font-size: var(--font-size-s);
		}

		strong {
			display: block;
			margin-bottom: var(--spacing-4xs);
		}
	}
}

.buttons {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.skip {
	padding: 0;
}
</style>
