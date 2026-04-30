<script setup lang="ts">
import { computed } from 'vue';

interface SelectOption {
	label: string;
	value: string;
	description?: string;
}

interface FieldPair {
	label: string;
	value: string;
}

interface RichComponent {
	type: string;
	text?: string;
	label?: string;
	value?: string;
	style?: string;
	url?: string;
	alt?: string;
	id?: string;
	placeholder?: string;
	options?: SelectOption[];
	fields?: FieldPair[];
}

interface RichInput {
	title?: string;
	message?: string;
	components?: RichComponent[];
}

interface RichOutput {
	type?: string;
	value?: string;
	id?: string;
	displayOnly?: boolean;
}

const props = defineProps<{
	input: unknown;
	output: unknown;
}>();

const parsed = computed(() => {
	const inp = (props.input ?? {}) as RichInput;
	const out = (props.output ?? {}) as RichOutput;
	return { input: inp, output: out };
});
</script>

<template>
	<div :class="$style.card">
		<!-- Title / message -->
		<div v-if="parsed.input.title" :class="$style.title">{{ parsed.input.title }}</div>
		<div v-if="parsed.input.message" :class="$style.message">{{ parsed.input.message }}</div>

		<!-- Components -->
		<template v-if="parsed.input.components">
			<template v-for="(comp, idx) in parsed.input.components" :key="idx">
				<div v-if="comp.type === 'section' && comp.text" :class="$style.section">
					{{ comp.text }}
				</div>

				<hr v-else-if="comp.type === 'divider'" :class="$style.divider" />

				<div v-else-if="comp.type === 'button'" :class="$style.button">
					<span
						:class="[
							$style.buttonPill,
							parsed.output.type === 'button' &&
								parsed.output.value === comp.value &&
								$style.buttonSelected,
						]"
					>
						{{ comp.label ?? comp.value }}
					</span>
				</div>

				<div
					v-else-if="comp.type === 'select' || comp.type === 'radio_select'"
					:class="$style.selectGroup"
				>
					<div :class="$style.selectLabel">{{ comp.label }}</div>
					<div v-for="opt in comp.options" :key="opt.value" :class="$style.selectOption">
						<span
							:class="[
								$style.optionDot,
								parsed.output.type === 'select' &&
									parsed.output.value === opt.value &&
									$style.optionSelected,
							]"
						/>
						<span>{{ opt.label }}</span>
						<span v-if="opt.description" :class="$style.optionDesc">{{ opt.description }}</span>
					</div>
				</div>

				<div v-else-if="comp.type === 'fields'" :class="$style.fieldsGroup">
					<div v-for="f in comp.fields" :key="f.label" :class="$style.fieldRow">
						<span :class="$style.fieldLabel">{{ f.label }}</span>
						<span>{{ f.value }}</span>
					</div>
				</div>

				<img
					v-else-if="comp.type === 'image' && comp.url"
					:src="comp.url"
					:alt="comp.alt ?? ''"
					:class="$style.image"
				/>
			</template>
		</template>

		<!-- User response (interactive cards only — display-only cards have
		     `output.displayOnly === true` and no user input to summarise). -->
		<div v-if="parsed.output.value && !parsed.output.displayOnly" :class="$style.response">
			User selected: <strong>{{ parsed.output.value }}</strong>
		</div>
	</div>
</template>

<style module lang="scss">
.card {
	margin-top: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
}

.title {
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--4xs);
}

.message {
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--3xs);
}

.section {
	margin-bottom: var(--spacing--4xs);
}

.divider {
	border: none;
	border-top: 1px solid var(--color--foreground);
	margin: var(--spacing--3xs) 0;
}

.button {
	display: inline-block;
	margin-right: var(--spacing--4xs);
	margin-bottom: var(--spacing--4xs);
}

.buttonPill {
	display: inline-block;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius);
	background-color: var(--color--foreground);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
}

.buttonSelected {
	background-color: var(--color--primary--tint-2);
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
}

.selectGroup {
	margin-bottom: var(--spacing--3xs);
}

.selectLabel {
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--4xs);
}

.selectOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) 0;
}

.optionDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	border: var(--border-width) var(--border-style) var(--color--text--tint-2);
	flex-shrink: 0;
}

.optionSelected {
	background-color: var(--color--primary);
	border-color: var(--color--primary);
}

.optionDesc {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--3xs);
}

.fieldsGroup {
	margin-bottom: var(--spacing--3xs);
}

.fieldRow {
	display: flex;
	gap: var(--spacing--2xs);
	padding: var(--spacing--5xs) 0;
}

.fieldLabel {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

.image {
	max-width: 100%;
	border-radius: var(--radius);
	margin: var(--spacing--3xs) 0;
}

.response {
	margin-top: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	background-color: var(--color--success--tint-4);
	border-radius: var(--radius);
	color: var(--color--success--shade-1);
	font-size: var(--font-size--3xs);
}
</style>
