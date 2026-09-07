<script setup lang="ts">
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
	<N8nHeading tag="h1" size="2xlarge" :bold="true">Hello from n8n</N8nHeading>
	<N8nText tag="p" color="text-base">
		Edit <code>src/pages/Home.vue</code> and run the build.
	</N8nText>
	<N8nButton @click="count++">Clicked {{ count }} times</N8nButton>
</template>
