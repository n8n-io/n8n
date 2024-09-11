<script lang="ts" setup="">
import { ref } from 'vue';
import { createEventBus } from 'n8n-design-system/utils';
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
const validators = ref({
	email: {
		validate: (value: string) => VALID_EMAIL_REGEX.test(value),
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
				<N8nFormInput
					id="email"
					v-model="email"
					label=""
					type="email"
					name="email"
					required
					:validate-on-blur="false"
					:validation-rules="validationRules"
					:validators="validators"
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
.buttons {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.skip {
	padding: 0;
}
</style>
