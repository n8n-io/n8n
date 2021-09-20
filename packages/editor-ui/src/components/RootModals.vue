<template>
	<div>
		<ModalRoot :name="ABOUT_MODAL_KEY">
			<template v-slot:default="{ modalName }">
				<AboutModal
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { ABOUT_MODAL_KEY } from '@/constants';

import AboutModal from './AboutModal.vue';
import ModalRoot from "./ModalRoot.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		AboutModal,
		ModalRoot,
	},
	data: () => ({
		ABOUT_MODAL_KEY,
	}),
});
</script>
