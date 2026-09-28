<script setup lang="ts">
import { ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const count = ref(0);
const enabled = ref(true);
</script>

<template>
	<h1 class="text-2xl font-bold">Hello from n8n</h1>
	<p class="mt-1 text-muted-foreground">
		Edit <code class="font-mono text-sm">src/pages/Home.vue</code>; the preview follows.
	</p>

	<section
		class="mt-6 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-xs"
	>
		<p class="text-sm">Clicked {{ count }} times</p>
		<Button @click="count++">Click me</Button>
	</section>

	<label class="mt-4 flex items-center gap-2 text-sm">
		<Switch v-model="enabled" />
		Notifications {{ enabled ? 'on' : 'off' }}
	</label>
</template>
