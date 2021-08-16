<template>
	<Modal
		:name="modalName"
		size="lg"
		:showClose="false"
	>
		<template slot="header">
			<div :class="$style.header">
				<div :class="$style.credInfo">
					<div :class="$style.headline">{{ displayName }}</div>
					<div :class="$style.subtitle">{{ credentialType.displayName }}</div>
				</div>
				<div :class="$style.credActions">
					<n8n-icon-button v-if="currentCredential" size="medium" title="Delete" icon="trash" type="text" />
					<n8n-button size="medium" label="Save" />
				</div>
			</div>
			<hr />
		</template>
		<template slot="content">
			<div :class="$style.container">
				<div :class="$style.sidebar">
					<n8n-menu type="secondary" @select="onTabSelect" defaultActive="connection">
						<n8n-menu-item index="connection"><span slot="title">Connection</span></n8n-menu-item>
						<n8n-menu-item index="info"><span slot="title">Info</span></n8n-menu-item>
					</n8n-menu>
				</div>
				<div :class="$style.mainContent" v-if="activeTab === 'connection'">
					<div :class="$style.infotip"><n8n-icon icon="info-circle"/> Need help filling out these fields? <a :href="credentialType.documentationUrl" target="_blank">Open docs</a></div>
					<credentials-input
						:credentialTypeData="credentialType"
					/>
				</div>
				<div :class="$style.mainContent" v-if="activeTab === 'info'">
					<el-row>
						<el-col :span="8">
							<span :class="$style.label">Can be used with:</span>
						</el-col>
						<el-col :span="16">
							<div v-for="node in nodesWithAccess" :key="node.name">
								<el-checkbox /> <span :class="$style.nodeName"> {{ node.displayName }} </span>
							</div>
						</el-col>
					</el-row>
					<el-row v-if="currentCredential">
						<el-col :span="8">
							<span :class="$style.label">Created:</span>
						</el-col>
						<el-col :span="16">
							<span>{{ convertToDisplayDate(currentCredential.createdAt) }}</span>
						</el-col>
					</el-row>
					<el-row v-if="currentCredential">
						<el-col :span="8">
							<span :class="$style.label">Last modified:</span>
						</el-col>
						<el-col :span="16">
							<TimeAgo :date="currentCredential.updatedAt" />
						</el-col>
					</el-row>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';

import Modal from './Modal.vue';
import CredentialsInput from './CredentialsInput.vue';
import { convertToDisplayDate } from './helpers';
import TimeAgo from './TimeAgo.vue';

export default Vue.extend({
	name: 'CredentialsDetail',
	components: {
		Modal,
		CredentialsInput,
		TimeAgo,
	},
	props: {
		modalName: {
			type: String,
			required: true,
		},
		activeId: {
			type: String,
			required: true,
		},
		mode: {
			type: String,
		},
	},
	data() {
		return {
			loading: true,
			credentialName: '',
			activeTab: 'connection',
		};
	},
	async mounted() {
		if (this.mode === 'new') {
			this.credentialName = await this.$store.dispatch('credentials/getNewCredentialName', { credentialTypeName: this.credentialTypeName });
		}

		this.loading = false;
	},
	computed: {
		currentCredential() {
			if (this.mode === 'new') {
				return null;
			}

			return this.$store.getters['credentials/getCredentialById'](this.activeId);
		},
		credentialTypeName() {
			if (this.mode === 'edit') {
				return this.currentCredential.type;
			}

			return this.activeId;
		},
		displayName() {
			if (this.mode === 'new') {
				return this.credentialName;
			}

			return this.currentCredential.name;
		},
		credentialType() {
			return this.$store.getters['credentials/getCredentialTypeByName'](this.credentialTypeName);
		},
		nodesWithAccess() {
			return this.$store.getters['credentials/getNodesWithAccess'](this.credentialTypeName);
		},
	},
	methods: {
		onTabSelect(tab: string) {
			this.activeTab = tab;
		},
		convertToDisplayDate,
	},
});
</script>

<style module lang="scss">
.headline {
	font-size: var(--font-size-m);
	line-height: 1.4;
	margin-bottom: 2px;
}

.mainContent {
	flex-grow: 1;
}

.sidebar {
	max-width: 170px;
	min-width: 170px;
	margin-right: var(--spacing-l);
	flex-grow: 1;
}

.header {
	display: flex;
}

.container {
	display: flex;
}

.credInfo {
	flex-grow: 1;
	margin-bottom: var(--spacing-s);
}

.credActions {
	> * {
		margin-left: var(--spacing-xs);
	}
}

.subtitle {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
}

.infotip {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
	margin-bottom: var(--spacing-l);
}

.nodeName {
	margin-left: var(--spacing-2xs);
}

.label {
	font-weight: var(--font-weight-bold);
}
</style>
