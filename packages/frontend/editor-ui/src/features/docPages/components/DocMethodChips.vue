<script setup lang="ts">
defineProps<{ methods: string[] }>();
</script>

<template>
	<span :class="$style.chips">
		<span
			v-for="method in methods"
			:key="method"
			:class="[$style.chip, $style[method.toLowerCase()]]"
			data-testid="doc-method-chip"
		>
			{{ method }}
		</span>
	</span>
</template>

<style lang="scss" module>
.chips {
	display: inline-flex;
	flex-shrink: 0;
	gap: var(--spacing--5xs);
}

// One hue for each common method. Other methods use the neutral text color.
.chip {
	--doc-method--hue: var(--text-color--subtle);

	padding-inline: var(--spacing--4xs);
	border-radius: var(--radius--2xs);
	background: color-mix(in srgb, var(--doc-method--hue) 14%, transparent);
	color: color-mix(in srgb, var(--doc-method--hue) 70%, var(--text-color));
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
	white-space: nowrap;
}

.get {
	--doc-method--hue: var(--color--blue-500);
}
.post {
	--doc-method--hue: var(--color--green-500);
}
.put,
.patch {
	--doc-method--hue: var(--color--orange-500);
}
.delete {
	--doc-method--hue: var(--color--red-500);
}
</style>
