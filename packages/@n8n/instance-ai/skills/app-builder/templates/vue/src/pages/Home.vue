<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { ref } from 'vue';

const count = ref(0);
const enabled = ref(true);
</script>

<template>
	<h1 class="text-2xl leading-sm font-bold text-text">Hello from n8n</h1>
	<p class="mt-2xs text-md leading-md text-text-subtle">
		Edit <code class="font-mono text-sm">src/pages/Home.vue</code> and run the build.
	</p>

	<section
		class="mt-lg flex items-center justify-between rounded-lg border border-border bg-surface p-md shadow-xs"
	>
		<p class="text-md text-text">Clicked {{ count }} times</p>
		<button
			type="button"
			class="inline-flex h-xl items-center rounded bg-brand px-xs text-sm font-medium text-neutral-white hover:bg-brand-hover active:bg-brand-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
			@click="count++"
		>
			Click me
		</button>
	</section>

	<label class="mt-md flex items-center gap-2xs text-sm text-text">
		<SwitchRoot
			v-model="enabled"
			class="relative h-sm w-xl shrink-0 rounded-full bg-border-strong transition-colors data-[state=checked]:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
		>
			<SwitchThumb
				class="block h-xs w-xs translate-x-4xs rounded-full bg-neutral-white shadow-xs transition-transform data-[state=checked]:translate-x-sm"
			/>
		</SwitchRoot>
		Notifications {{ enabled ? 'on' : 'off' }}
	</label>
</template>
