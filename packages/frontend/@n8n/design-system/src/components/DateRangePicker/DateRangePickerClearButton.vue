<script setup lang="ts">
import { injectDateRangePickerRootContext } from 'reka-ui';

import N8nButton from '../N8nButton';
import { useDateRangePickerContext } from './dateRangePicker.context';

const rootContext = injectDateRangePickerRootContext();
const { activeField } = useDateRangePickerContext();

function clearRange() {
	rootContext.onDateChange({ start: undefined, end: undefined });
	activeField.value = 'start';
}
</script>

<template>
	<N8nButton variant="ghost" size="small" label="Clear" @click="clearRange" />
</template>
