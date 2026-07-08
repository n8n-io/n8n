<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';
import { inject } from 'vue';

import N8nButton from '../N8nButton';
import { N8N_DATE_RANGE_PICKER_ACTIVE_FIELD } from './dateRangePicker.context';

const rootContext = injectDateRangePickerRootContext();
const activeField = inject(N8N_DATE_RANGE_PICKER_ACTIVE_FIELD);

function clearRange() {
	rootContext.onDateChange({ start: undefined, end: undefined });
	if (activeField) {
		activeField.value = 'start';
	}
}
</script>

<template>
	<N8nButton variant="ghost" size="small" label="Clear" @click="clearRange" />
</template>
