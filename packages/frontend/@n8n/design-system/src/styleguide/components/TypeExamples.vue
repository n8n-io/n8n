<script setup lang="ts">
import { computed, ref } from 'vue';

import N8nInput from '../../components/N8nInput/Input.vue';
import N8nInputLabel from '../../components/N8nInputLabel/InputLabel.vue';
import N8nOption from '../../components/N8nOption/Option.vue';
import N8nSelect from '../../components/N8nSelect/Select.vue';

const DEFAULT_SAMPLE = 'The quick brown fox jumps over the lazy dog.';

type WeightId = 'regular' | 'medium' | 'bold';

const sizes = [
	{
		name: '4xs',
		fontSize: 'var(--font-size--4xs)',
		letterSpacing: 'var(--letter-spacing--wide)',
		lineHeight: 'var(--line-height--xs)',
	},
	{
		name: '3xs',
		fontSize: 'var(--font-size--3xs)',
		letterSpacing: 'var(--letter-spacing--normal)',
		lineHeight: 'var(--line-height--sm)',
	},
	{
		name: '2xs',
		fontSize: 'var(--font-size--2xs)',
		letterSpacing: 'var(--letter-spacing--normal)',
		lineHeight: 'var(--line-height--md)',
	},
	{
		name: 'xs',
		fontSize: 'var(--font-size--xs)',
		letterSpacing: 'var(--letter-spacing--normal)',
		lineHeight: 'var(--line-height--md)',
	},
	{
		name: 'sm',
		fontSize: 'var(--font-size--sm)',
		letterSpacing: 'var(--letter-spacing--normal)',
		lineHeight: 'var(--line-height--lg)',
	},
	{
		name: 'md',
		fontSize: 'var(--font-size--md)',
		letterSpacing: 'var(--letter-spacing--normal)',
		lineHeight: 'var(--line-height--lg)',
	},
	{
		name: 'lg',
		fontSize: 'var(--font-size--lg)',
		letterSpacing: 'var(--letter-spacing--tight)',
		lineHeight: 'var(--line-height--xl)',
	},
	{
		name: 'xl',
		fontSize: 'var(--font-size--xl)',
		letterSpacing: 'var(--letter-spacing--tighter)',
		lineHeight: 'var(--line-height--xl)',
	},
	{
		name: '2xl',
		fontSize: 'var(--font-size--2xl)',
		letterSpacing: 'var(--letter-spacing--tightest)',
		lineHeight: 'var(--line-height--xl)',
	},
] as const;

const primaryWeights = [
	{ id: 'regular', name: 'Regular', value: '400', token: 'var(--font-weight--regular)' },
	{ id: 'medium', name: 'Medium', value: '500', token: 'var(--font-weight--medium)' },
	{ id: 'bold', name: 'Bold', value: '600', token: 'var(--font-weight--bold)' },
] as const;

const monospaceWeights = [
	{ id: 'regular', name: 'Regular', value: '400', token: 'var(--font-weight--regular)' },
	{ id: 'bold', name: 'Bold', value: '600', token: 'var(--font-weight--bold)' },
] as const;

const props = withDefaults(
	defineProps<{
		family?: 'primary' | 'monospace';
	}>(),
	{
		family: 'primary',
	},
);

const sampleText = ref(DEFAULT_SAMPLE);
const selectedWeight = ref<WeightId>('regular');

const weights = computed(() => (props.family === 'monospace' ? monospaceWeights : primaryWeights));
const fontFamily = computed(() =>
	props.family === 'monospace' ? 'var(--font-family--monospace)' : 'var(--font-family)',
);
const selectedWeightToken = computed(
	() =>
		weights.value.find((weight) => weight.id === selectedWeight.value)?.token ??
		'var(--font-weight--regular)',
);
const displayedText = computed(() => sampleText.value.trim() || DEFAULT_SAMPLE);
const sampleInputId = computed(() => `type-examples-sample-${props.family}`);
const weightInputId = computed(() => `type-examples-weight-${props.family}`);
</script>

<template>
	<div class="type-examples">
		<div class="type-examples__controls">
			<N8nInputLabel
				class="type-examples__sample-control"
				label="Sample"
				size="small"
				:input-name="sampleInputId"
			>
				<N8nInput
					:id="sampleInputId"
					v-model="sampleText"
					size="small"
					placeholder="Type a sample string"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				class="type-examples__weight-control"
				label="Weight"
				size="small"
				:input-name="weightInputId"
			>
				<N8nSelect :id="weightInputId" v-model="selectedWeight" size="small">
					<N8nOption
						v-for="weight in weights"
						:key="weight.id"
						:value="weight.id"
						:label="`${weight.name} (${weight.value})`"
					/>
				</N8nSelect>
			</N8nInputLabel>
		</div>

		<div class="type-examples__specimens" :style="{ fontFamily, fontWeight: selectedWeightToken }">
			<div v-for="size in sizes" :key="size.name" class="type-examples__row">
				<span class="type-examples__size">{{ size.name }}</span>
				<p
					class="type-examples__sample"
					:style="{
						fontSize: size.fontSize,
						letterSpacing: size.letterSpacing,
						lineHeight: size.lineHeight,
					}"
				>
					{{ displayedText }}
				</p>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.type-examples {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	margin-block: var(--spacing--xl);
	color: var(--text-color);
}

.type-examples__controls {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
	align-items: flex-end;
}

.type-examples__sample-control {
	flex: 1 1 var(--spacing--5xl);
	min-width: 0;
}

.type-examples__weight-control {
	flex: 0 0 var(--spacing--5xl);

	:deep(.el-select) {
		width: 100%;
	}
}

.type-examples__specimens {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.type-examples__row {
	display: flex;
	gap: var(--spacing--lg);
	align-items: baseline;
}

.type-examples__size {
	flex: 0 0 var(--spacing--2xl);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtle);
	font-family: var(--font-family);
}

.type-examples__sample {
	flex: 1 1 auto;
	min-width: 0;
	margin: 0;
}
</style>
