<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		width="50%"
		:center="true"
		maxWidth="460px"
	>
		<template slot="header">
			<h2 :class="$style.title">Add new credential</h2>
		</template>
		<template slot="content">
			<div :class="$style.container">
				<div :class="$style.subtitle">Select an app or service to connect to</div>
				<n8n-select
					filterable
					defaultFirstOption
					placeholder="Search for app..."
					size="xlarge"
					ref="select"
					:value="selected"
					@change="onSelect"
				>
					<font-awesome-icon icon="search" slot="prefix" />
					<n8n-option
						v-for="credential in allCredentialTypes"
						:value="credential.name"
						:key="credential.name"
						:label="credential.displayName"
						filterable
					/>
				</n8n-select>
			</div>
		</template>
		<template slot="footer">
			<div :class="$style.footer">
				<n8n-button
					label="Continue"
					float="right"
					size="large"
					:disabled="!selected"
					@click="openCredentialType"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from "vuex";

import Modal from './Modal.vue';

export default Vue.extend({
	name: 'CredentialsSelectModal',
	components: {
		Modal,
	},
	mounted() {
		setTimeout(() => {
			const element = this.$refs.select as HTMLSelectElement;
			if (element) {
				element.focus();
			}
		}, 0);
	},
	data() {
		return {
			modalBus: new Vue(),
			selected: '',
		};
	},
	computed: {
		...mapGetters('credentials', ['allCredentialTypes']),
	},
	props: {
		modalName: {
			type: String,
		},
	},
	methods: {
		onSelect(type: string) {
			this.selected = type;
		},
		openCredentialType () {
			this.modalBus.$emit('close');
			this.$store.dispatch('ui/openNewCredential', { type: this.selected });
		},
	},
});
</script>

<style module lang="scss">
.container {
	margin-bottom: var(--spacing-l);
}

.title {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-regular);
}

.subtitle {
	margin-bottom: var(--spacing-s);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}
</style>
