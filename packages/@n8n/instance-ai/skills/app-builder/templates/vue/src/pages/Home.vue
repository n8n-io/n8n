<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { ref } from 'vue';

const count = ref(0);
const enabled = ref(true);
</script>

<template>
	<h1 class="text-2xl font-bold">Hello from n8n</h1>
	<p class="mt-1 text-muted-foreground">
		Edit <code class="font-mono text-sm">src/pages/Home.vue</code> and run the build.
	</p>

	<section
		class="mt-6 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-xs"
	>
		<p class="text-sm">Clicked {{ count }} times</p>
		<button
			type="button"
			class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			@click="count++"
		>
			Click me
		</button>
	</section>

	<label class="mt-4 flex items-center gap-2 text-sm">
		<SwitchRoot
			v-model="enabled"
			class="relative h-5 w-9 shrink-0 rounded-full bg-input transition-colors data-[state=checked]:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<SwitchThumb
				class="block size-4 translate-x-0.5 rounded-full bg-background shadow-xs transition-transform data-[state=checked]:translate-x-4"
			/>
		</SwitchRoot>
		Notifications {{ enabled ? 'on' : 'off' }}
	</label>
</template>
