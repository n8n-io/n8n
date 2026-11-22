<script setup lang="ts">
import Modals from '@/app/components/Modals.vue';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';
import CustomActionWizardHost from '@/features/shared/customNodes/CustomActionWizardHost.vue';
</script>

<template>
	<div :id="APP_MODALS_ELEMENT_ID">
		<Modals />
		<CustomActionWizardHost />
	</div>
</template>
