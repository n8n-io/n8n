<script setup lang="ts">
// fetch form with id from useRout
import { computed, onMounted } from 'vue';
import { useFormsStore } from '@/stores';
import { useRoute } from 'vue-router/composables';
import { VIEWS } from '@/constants';

const formsStore = useFormsStore();
const route = useRoute();
const form = formsStore.formById(route.params.id);

onMounted(() => {
	formsStore.fetchForm({ id: route.params.id });
});
</script>
<template>
	<div>
		<h1>Form yup</h1>
		<div>{{ form }}</div>
		<RouterLink :to="{ name: VIEWS.FORM_BUILDER }">Go to edit</RouterLink>
	</div>
</template>
