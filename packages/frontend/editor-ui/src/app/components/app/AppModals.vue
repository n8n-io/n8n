<script setup lang="ts">
import Modals from '@/app/components/Modals.vue';
import AppAlertDialogHost from '@/app/components/app/AppAlertDialogHost.vue';
import AppPromptDialogHost from '@/app/components/app/AppPromptDialogHost.vue';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';
</script>

<template>
	<div :id="APP_MODALS_ELEMENT_ID">
		<Modals />
	</div>
	<AppAlertDialogHost />
	<AppPromptDialogHost />
</template>
