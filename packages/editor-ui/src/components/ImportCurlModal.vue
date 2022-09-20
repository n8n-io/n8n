<template>
	<Modal
		width="700px"
		:title="$locale.baseText('importCurlModal.title')"
		:eventBus="modalBus"
		:name="IMPORT_CURL"
		:center="true"
	>
		<template slot="content">
			<div :class="$style.container">
			<n8n-input-label :label="$locale.baseText('importCurlModal.input.label')">
					<n8n-input
						:value="curlCommand"
						type="textarea"
						:rows="5"
						:placeholder="$locale.baseText('importCurlModal.input.placeholder')"
						@input="onInput"
						@focus="$event.target.select()"
						ref="input"
					/>
			</n8n-input-label>
			</div>
		</template>
		<template slot="footer">
			<div>
				<div>
					<n8n-button @click="importCurlCommand" float="right" label="Import" />
				</div>
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
			IMPORT_CURL,
			curlCommand: '',
			modalBus: new Vue(),
		};
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
		onInput(value: string) {
			this.curlCommand = value;
		},
		importCurlCommand() {
			this.$store.dispatch('ui/setCommand', { command: this.curlCommand });
			this.modalBus.$emit('close');
		},
	},
	mounted() {
		this.curlCommand = this.$store.getters['ui/getCommand'];
		setTimeout(() => {
			(this.$refs.input as HTMLTextAreaElement).focus();
		});
	},
});
</script>

<style module lang="scss">
.ajapapa {
	display: flex;
flex-direction: column
}

.container > * {
	margin-bottom: var(--spacing-s);
}
</style>
