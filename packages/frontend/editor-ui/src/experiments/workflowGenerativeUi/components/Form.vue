<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	title: string;
	fields: Array<{ label: string; type: string }>;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="title"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.sheet" data-test-id="form-sheet">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" />
				<div :class="$style.heading">
					<strong :class="$style.title">{{ title }}</strong>
					<span :class="$style.caption">Form fields</span>
				</div>
			</header>
			<div :class="$style.fields">
				<div
					v-for="field in fields"
					:key="field.label"
					:class="$style.field"
					data-test-id="form-field"
				>
					<span :class="$style.fieldHeader">
						<span :class="$style.fieldLabel">{{ field.label }}</span>
						<span :class="$style.fieldType" data-test-id="form-field-type">{{ field.type }}</span>
					</span>
					<span :class="$style.input" data-test-id="form-field-input" aria-hidden="true" />
				</div>
			</div>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.sheet {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-top: var(--spacing--4xs) solid var(--border-color--strong);
	border-radius: var(--radius--md);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.heading {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.title {
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}

.caption {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.fieldHeader {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.fieldLabel {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.fieldType {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.input {
	display: block;
	min-height: var(--height--md);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--2xs);
}
</style>
