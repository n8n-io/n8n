<script setup lang="ts">
defineProps<{
	warning: string;
	logged: string;
	legitimate: string;
	policy: string;
}>();
</script>

<template>
	<div>
		<p>{{ warning }}</p>
		<ul :class="$style.list">
			<li>{{ logged }}</li>
			<li>{{ legitimate }}</li>
			<li>{{ policy }}</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.list {
	text-align: left;
	margin-top: var(--spacing--2xs);
	padding-left: var(--spacing--xl);

	li + li {
		margin-top: var(--spacing--4xs);
	}
}
</style>

<style lang="scss">
.reveal-redacted-data-modal {
	width: 500px;

	.el-message-box__content {
		padding: var(--spacing--sm) var(--spacing--lg);
	}
}
</style>
