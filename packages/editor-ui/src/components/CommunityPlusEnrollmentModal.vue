<script lang="ts" setup="">
import { ref } from 'vue';
import { createEventBus } from 'n8n-design-system/utils';
import type { Validatable, IValidator } from 'n8n-design-system';
import Modal from '@/components/Modal.vue';
import { N8nFormInput } from 'n8n-design-system';
import { VALID_EMAIL_REGEX } from '@/constants';

const props = defineProps<{
	modalName: string;
	data: {
		closeCallback: () => void;
	};
}>();

const valid = ref(false);
const email = ref('');
const validationRules = ref([{ name: 'email' }]);
const validators = ref<{ [key: string]: IValidator }>({
	email: {
		validate: (value: Validatable) => {
			if (typeof value !== 'string') {
				return false;
			}

			if (!VALID_EMAIL_REGEX.test(value)) {
				return {
					messageKey: 'settings.users.invalidEmailError',
					options: { interpolate: { email: value } },
				};
			}

			return false;
		},
	},
});

const modalBus = createEventBus();

const closeModal = () => {
	modalBus.emit('close');
	props.data.closeCallback();
};

const confirm = () => {
	closeModal();
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
					<N8nBadge>Time limited offer</N8nBadge>
				</p>
				<N8nText tag="h1" align="center" size="xlarge">Unlock selected Pro features</N8nText>
				<N8nText tag="p"
					>Receive a free activation key to access a limited set of pro features on your n8n
					installation.</N8nText
				>
				<ul :class="$style.features">
					<li>
						<N8nIcon icon="check" class="mr-xs" />
						<N8nText>
							<strong>Workflow history</strong>
							Review and restore a previous version of your work within the last 24 hours
						</N8nText>
					</li>
					<li>
						<N8nIcon icon="check" class="mr-xs" />
						<N8nText>
							<strong>Advanced debugging</strong>
							Easily debug your workflows using data from failed executions
						</N8nText>
					</li>
					<li>
						<N8nIcon icon="check" class="mr-xs" />
						<N8nText>
							<strong>Custom execution search</strong>
							Easily debug your workflows using data from failed executions
						</N8nText>
					</li>
				</ul>
				<N8nFormInput
					id="email"
					v-model="email"
					label="Email"
					type="email"
					name="email"
					label-size="small"
					tag-size="small"
					required
					:show-required-asterisk="true"
					:validate-on-blur="false"
					:validation-rules="validationRules"
					:validators="validators"
					info-text="We'll only store this email to register your license and send your key"
					@validate="valid = $event"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton :class="$style.skip" type="secondary" text @click="closeModal"> Skip </N8nButton>
				<N8nButton :disabled="!valid" type="primary" @click="confirm">
					Send me a free license key
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.top {
	display: flex;
	justify-content: center;
}

.features {
	padding: var(--spacing-s);
	list-style: none;

	li {
		display: flex;
		padding: 0 var(--spacing-s) var(--spacing-s) 0;

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
