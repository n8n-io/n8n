<template>
	<Modal
		:name="name"
		:title="$locale.baseText('settings.api.delete.title')"
		:center="true"
		:eventBus="modalBus"
		width="460px"
		@enter="deleteApiKey"
	>
		<template slot="content">
			<div>
				<n8n-text tag="p" color="text-base">
					{{$locale.baseText('settings.api.delete.description')}}
				</n8n-text>
			</div>
		</template>
		<template slot="footer">
			<div :class="$style.footer">
				<n8n-button type="outline" @click="cancel">
					{{ $locale.baseText('generic.cancel') }}
				</n8n-button>
				<n8n-button :loading="loading" @click="deleteApiKey">
					{{ $locale.baseText('settings.api.delete.button') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>


<script lang="ts">
import Vue from 'vue';
import mixins from "vue-typed-mixins";

import Modal from "./Modal.vue";
import { N8nUserSelect } from 'n8n-design-system';
import { showMessage } from "../components/mixins/showMessage";
import {DELETE_API_KEY_MODAL_KEY} from "../constants";

export default mixins(showMessage).extend({
	components: {
		Modal,
		N8nUserSelect,
	},
	name: "DeleteApiKeyModal",
	data() {
		return {
			modalBus: new Vue(),
			name: DELETE_API_KEY_MODAL_KEY,
			loading: false,
		};
	},
	methods: {
		cancel() {
			this.$store.dispatch('ui/closeModal', DELETE_API_KEY_MODAL_KEY);
		},
		async deleteApiKey() {
			this.loading = true;

			try {
				this.$store.dispatch('settings/deleteApiKey');
				this.$store.dispatch('ui/closeModal', DELETE_API_KEY_MODAL_KEY);
				this.$showMessage({ title: this.$locale.baseText("settings.api.delete.toast"), type: 'success' });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.delete.error'));
			} finally {
				this.loading = false;
			}
		},
	},
});

</script>

<style lang="scss" module>
.footer {
	display: flex;
	justify-content: flex-end;

	button + button {
		margin-left: var(--spacing-xs)
	}
}
</style>
