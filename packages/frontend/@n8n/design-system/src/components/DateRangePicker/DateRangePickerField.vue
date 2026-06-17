<script setup lang="ts">
import { DateRangePickerField, DateRangePickerInput } from 'reka-ui';

import N8nText from '../N8nText';

type Segment = {
	part: string;
	value: string;
};
type Segments = {
	start: Segment[];
	end: Segment[];
};

function hasTime(segments: Segments) {
	return [...segments.start, ...segments.end].some((segment) =>
		['hour', 'minute', 'second', 'dayPeriod'].includes(segment.part),
	);
}
</script>

<template>
	<DateRangePickerField v-slot="{ segments }" as-child>
		<div v-if="hasTime(segments)">
			<N8nText bold color="text-light" tag="div" class="mb-3xs">Start</N8nText>
			<div :class="$style.Inline" class="mb-xs">
				<template v-for="item in segments.start" :key="item.part">
					<DateRangePickerInput
						v-if="item.part === 'literal'"
						:part="item.part"
						class="DateFieldLiteral"
						type="start"
					>
						{{ item.value }}
					</DateRangePickerInput>
					<DateRangePickerInput
						v-else
						:part="item.part"
						:class="$style.DateFieldSegment"
						type="start"
					>
						{{ item.value }}
					</DateRangePickerInput>
				</template>
			</div>
			<N8nText bold color="text-light" tag="div" class="mb-3xs">End</N8nText>
			<div :class="$style.Inline">
				<template v-for="item in segments.end" :key="item.part">
					<DateRangePickerInput
						v-if="item.part === 'literal'"
						:part="item.part"
						:class="$style.DateFieldLiteral"
						type="end"
					>
						{{ item.value }}
					</DateRangePickerInput>
					<DateRangePickerInput
						v-else
						:part="item.part"
						:class="$style.DateFieldSegment"
						type="end"
					>
						{{ item.value }}
					</DateRangePickerInput>
				</template>
			</div>
		</div>
		<div v-else :class="$style.Inline">
			<template v-for="item in segments.start" :key="item.part">
				<DateRangePickerInput
					v-if="item.part === 'literal'"
					:part="item.part"
					class="DateFieldLiteral"
					type="start"
				>
					{{ item.value }}
				</DateRangePickerInput>
				<DateRangePickerInput
					v-else
					:part="item.part"
					:class="$style.DateFieldSegment"
					type="start"
				>
					{{ item.value }}
				</DateRangePickerInput>
			</template>
			-
			<template v-for="item in segments.end" :key="item.part">
				<DateRangePickerInput
					v-if="item.part === 'literal'"
					:part="item.part"
					:class="$style.DateFieldLiteral"
					type="end"
				>
					{{ item.value }}
				</DateRangePickerInput>
				<DateRangePickerInput v-else :part="item.part" :class="$style.DateFieldSegment" type="end">
					{{ item.value }}
				</DateRangePickerInput>
			</template>
		</div>
	</DateRangePickerField>
</template>

<style lang="css" module>
.DateFieldSegment:focus {
	outline: 2px solid rgba(67, 142, 255, 1);
	border-radius: 0.25rem;
}

.Inline {
	display: flex;
	padding: 6px 12px;
	align-items: center;
	border-radius: 0.25rem;
	border-width: 1px;
	text-align: center;
	user-select: none;
	border: var(--border);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
