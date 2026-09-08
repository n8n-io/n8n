<script setup lang="ts">
import { ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const count = ref(0);
const enabled = ref(true);
</script>

<template>
	<h1 class="text-2xl font-bold">Hello from n8n</h1>
	<p class="mt-1 text-muted-foreground">
		Edit <code class="font-mono text-sm">src/pages/Home.vue</code> and run the build.
	</p>

	<Card class="mt-6">
		<CardHeader>
			<CardTitle>Clicked {{ count }} times</CardTitle>
		</CardHeader>
		<CardContent class="flex items-center justify-between gap-4">
			<Button @click="count++">Click me</Button>
			<label class="flex items-center gap-2 text-sm">
				<Switch v-model="enabled" />
				Notifications {{ enabled ? 'on' : 'off' }}
			</label>
		</CardContent>
	</Card>
</template>
