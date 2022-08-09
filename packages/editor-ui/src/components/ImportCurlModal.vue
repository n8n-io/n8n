<template>
	<Modal
		width="700px"
		title="Import cURL command"
		:eventBus="modalBus"
		:name="IMPORT_CURL"
		:center="true"
	>
		<template slot="content">
			<div :class="$style.container">
			<n8n-input-label label="cURL Command">
					<n8n-input
						:value="curlCommand"
						type="textarea"
						:rows="5"
						placeholder="Paste the cURL command here"
						@input="onInput"
						ref="input"
					/>
			</n8n-input-label>
			</div>
		</template>
		<template slot="footer">
			<div class="action-buttons">
				<n8n-button @click="importCurlCommand" float="right" label="Import" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import Modal from './Modal.vue';
import { IMPORT_CURL } from '../constants';

export default Vue.extend({
	name: 'ImportCurlModal',
	components: {
		Modal,
	},
	data() {
		return {
			curlCommand: '',
			IMPORT_CURL,
			modalBus: new Vue(),
		};
	},
	computed: {},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
		onInput(value: string) {
			this.curlCommand = value;
		},
		importCurlCommand() {
			// do dispatch instead
			// this.commit curl property
			this.$store.dispatch('ui/setCommand', { command: this.curlCommand });
			this.modalBus.$emit('close');
		},
	},
});
</script>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing-s);
}
</style>
