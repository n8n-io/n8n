<script setup lang="ts">
import { DatePickerField, DatePickerInput } from 'reka-ui';
</script>

<template>
	<DatePickerField v-slot="{ segments }" as-child>
		<div :class="$style.Inline">
			<template v-for="item in segments" :key="item.part">
				<DatePickerInput v-if="item.part === 'literal'" :part="item.part" class="DateFieldLiteral">
					{{ item.value }}
				</DatePickerInput>
				<DatePickerInput v-else :part="item.part" :class="$style.DateFieldSegment">
					{{ item.value }}
				</DatePickerInput>
			</template>
		</div>
	</DatePickerField>
</template>

<style lang="css" module>
.DateFieldSegment:focus {
	outline: 2px solid var(--color--primary);
	border-radius: var(--radius--sm);
}

.Inline {
	display: flex;
	padding: var(--spacing--3xs) var(--spacing--xs);
	align-items: center;
	border-radius: var(--radius);
	text-align: center;
	user-select: none;
	border: var(--border);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
