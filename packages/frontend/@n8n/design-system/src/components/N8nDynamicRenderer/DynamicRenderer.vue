<script
	lang="ts"
	setup
	generic="T extends Record<string, string | number | boolean | null | undefined>"
>
import type { Component, VNode } from 'vue';
import { h } from 'vue';

type RenderType = Component | VNode;

const props = withDefaults(
	defineProps<{
		render: RenderType | RenderType[];
		ctx: T;
	}>(),
	{
		render: () => [],
		ctx: () => ({}),
	},
);

const Render = () =>
	props.render.constructor === Array
		? props.render.map((render) => h(render, props.ctx))
		: h(props.render, props.ctx);
</script>

<template>
	<Render />
</template>
