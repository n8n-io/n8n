<script setup lang="ts">
import { QuickConnectOption } from '@n8n/api-types';
import { N8nCheckbox } from '@n8n/design-system';
import { computed, ref, Ref, watch } from 'vue';

const props = defineProps<{
	quickConnectOption: QuickConnectOption;
	serviceName: string;
	showError: Ref<boolean>;
	confirmed: Ref<boolean>;
}>();

props.confirmed.value = !props.quickConnectOption?.consentCheckbox?.length;

const consentCheckboxes = computed(() => {
	if (props.quickConnectOption?.consentCheckbox?.length) {
		return props.quickConnectOption.consentCheckbox.map((text) => ({
			text,
			checked: ref(false),
		}));
	}
	return [];
});

watch(
	() => consentCheckboxes,
	(state) => {
		console.log('state updated?');
		props.confirmed.value = state.value.every((checkbox) => checkbox.value.checked);
		props.showError.value = false;
	},
);
console.log(consentCheckboxes);
</script>

<template>
	<div v-if="props.quickConnectOption">
		<div>
			{{ props.quickConnectOption.consentText }}
		</div>
		<N8nCheckbox
			v-if="props.quickConnectOption.consentCheckbox?.length"
			v-for="consentCheckbox in consentCheckboxes"
			v-model="consentCheckbox.checked"
		>
			<template #label>
				OK? {{ consentCheckbox.text }}
				<!-- eslint-disable-next-line vue/no-v-html -->
				<span v-html="consentCheckbox.text" />
				<span v-if="showError && !consentCheckbox.checked"> ERROR!!!</span>
			</template>
		</N8nCheckbox>
	</div>
</template>
