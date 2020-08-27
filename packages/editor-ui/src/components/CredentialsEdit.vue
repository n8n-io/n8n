<template>
	<div v-if="dialogVisible" @keydown.stop>
		<el-dialog :visible="dialogVisible" append-to-body width="55%" :title="title" :nodeType="nodeType"  :before-close="closeDialog">
			<div name="title" class="titleContainer" slot="title">
				<div id="left">{{title}}</div>
				<div id="right">
					<div v-if="credentialType" id="docsContainer">
						<svg id="help-logo" target="_blank" width="18px" height="18px" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
							<title>Node Documentation</title>
							<g id="MVP-Onboard-proposal" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
								<g id="Node-modal-(docs-link)" transform="translate(-1127.000000, -836.000000)" fill-rule="nonzero">
									<g id="Group" transform="translate(1117.000000, 825.000000)">
										<g id="mdi-help-box" transform="translate(10.000000, 11.000000)">
											<g id="Icon" transform="translate(2.250000, 2.250000)" fill="#FF6150">
												<path d="M6,11.25 L7.5,11.25 L7.5,9.75 L6,9.75 L6,11.25 M6.75,2.25 C5.09314575,2.25 3.75,3.59314575 3.75,5.25 L5.25,5.25 C5.25,4.42157288 5.92157288,3.75 6.75,3.75 C7.57842712,3.75 8.25,4.42157288 8.25,5.25 C8.25,6.75 6,6.5625 6,9 L7.5,9 C7.5,7.3125 9.75,7.125 9.75,5.25 C9.75,3.59314575 8.40685425,2.25 6.75,2.25 M1.5,0 L12,0 C12.8284271,0 13.5,0.671572875 13.5,1.5 L13.5,12 C13.5,12.8284271 12.8284271,13.5 12,13.5 L1.5,13.5 C0.671572875,13.5 0,12.8284271 0,12 L0,1.5 C0,0.671572875 0.671572875,0 1.5,0 Z" id="Icon-Shape"></path>
											</g>
											<rect id="ViewBox" x="0" y="0" width="18" height="18"></rect>
										</g>
									</g>
								</g>
							</g>
						</svg>
						<span v-if="credentialType" id='docLinkText'>Need help? <a id="doc-hyperlink"  :href="'https://docs.n8n.io/credentials/' + documentationUrl + '/?utm_source=n8n_app&utm_medium=left_nav_menu&utm_campaign=create_new_credentials_modal'" target="_blank">Open credential docs</a></span>
					</div>
				</div>
			</div>
			<div class="credential-type-item">
				<el-row v-if="!setCredentialType">
					<el-col :span="6">
						Credential type:
					</el-col>
					<el-col :span="18">
						<el-select v-model="credentialType" filterable placeholder="Select Type" size="small">
							<el-option
								v-for="item in credentialTypes"
								:key="item.name"
								:label="item.displayName"
								:value="item.name">
							</el-option>
						</el-select>
					</el-col>
				</el-row>
			</div>

			<credentials-input v-if="credentialType" @credentialsCreated="credentialsCreated" @credentialsUpdated="credentialsUpdated" :credentialTypeData="getCredentialTypeData(credentialType)" :credentialData="credentialData" :nodesInit="nodesInit"></credentials-input>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import CredentialsInput from '@/components/CredentialsInput.vue';
import {
	ICredentialsCreatedEvent,
	ICredentialsDecryptedResponse,
} from '@/Interface';

import {
	NodeHelpers,
	ICredentialType,
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';

import mixins from 'vue-typed-mixins';
import { INodeUi } from '../Interface';

export default mixins(
	restApi,
	showMessage,
).extend({
	name: 'CredentialsEdit',
	props: [
		'dialogVisible',		// Boolean
		'editCredentials',
		'setCredentialType',	// String
		'nodesInit',			// Array
	],
	components: {
		CredentialsInput,
	},
	data () {
		return {
			credentialData: null as ICredentialsDecryptedResponse | null,
			credentialType: null as string | null,
		};
	},
	computed: {
		credentialTypes (): ICredentialType[] {
			const credentialTypes = this.$store.getters.allCredentialTypes;
			if (credentialTypes === null) {
				return [];
			}
			return credentialTypes;
		},
		title (): string {
			if (this.editCredentials) {
				const credentialType = this.$store.getters.credentialType(this.editCredentials.type);
				return `Edit Credentials: "${credentialType.displayName}"`;
			} else {
				if (this.credentialType) {
					const credentialType = this.$store.getters.credentialType(this.credentialType);
					return `Create New Credentials: "${credentialType.displayName}"`;
				} else {
					return `Create New Credentials`;
				}
			}
		},
		documentationUrl (): string {
			if (this.editCredentials) {
				const credentialType = this.$store.getters.credentialType(this.editCredentials.type);
				if (credentialType.documentationUrl === undefined) {
					return credentialType.name;
				} else {
					return `${credentialType.documentationUrl}`;
				}
			} else {
				if (this.credentialType) {
					const credentialType = this.$store.getters.credentialType(this.credentialType);

					if (credentialType.documentationUrl === undefined) {
						return credentialType.name;
					} else {
						return `${credentialType.documentationUrl}`;
					}
				} else {
					return '';
				}
			}
		},
		node (): INodeUi {
			return this.$store.getters.activeNode;
		},
		nodeType (): INodeTypeDescription | null {
			const activeNode = this.node;
			if (this.node) {
				return this.$store.getters.nodeType(this.node.type);
			}

			return null;
		},
	},
	watch: {
		async dialogVisible (newValue, oldValue): Promise<void> {
			if (newValue) {
				if (this.editCredentials) {
					// Credentials which should be edited are given
					const credentialType = this.$store.getters.credentialType(this.editCredentials.type);

					if (credentialType === null) {
						this.$showMessage({
							title: 'Credential type not known',
							message: `Credentials of type "${this.editCredentials.type}" are not known.`,
							type: 'error',
							duration: 0,
						});
						this.closeDialog();
						return;
					}

					if (this.editCredentials.id === undefined) {
						this.$showMessage({
							title: 'Credential ID missing',
							message: 'The ID of the credentials which should be edited is missing!',
							type: 'error',
						});
						this.closeDialog();
						return;
					}

					let currentCredentials: ICredentialsDecryptedResponse | undefined;
					try {
						currentCredentials = await this.restApi().getCredentials(this.editCredentials.id as string, true) as ICredentialsDecryptedResponse | undefined;
					} catch (error) {
						this.$showError(error, 'Problem loading credentials', 'There was a problem loading the credentials:');
						this.closeDialog();
						return;
					}

					if (currentCredentials === undefined) {
						this.$showMessage({
							title: 'Credentials not found',
							message: `Could not find the credentials with the id: ${this.editCredentials.id}`,
							type: 'error',
							duration: 0,
						});
						this.closeDialog();
						return;
					}

					if (currentCredentials === undefined) {
						this.$showMessage({
							title: 'Problem loading credentials',
							message: 'No credentials could be loaded!',
							type: 'error',
						});
						return;
					}

					this.credentialData = currentCredentials;
				} else {
					if (this.credentialType || this.setCredentialType) {
						const credentialType = this.$store.getters.credentialType(this.credentialType || this.setCredentialType);
						if (credentialType === null) {
							this.$showMessage({
								title: 'Credential type not known',
								message: `Credentials of type "${this.credentialType || this.setCredentialType}" are not known.`,
								type: 'error',
								duration: 0,
							});
							this.closeDialog();
							return;
						}
					}

					this.credentialData = null;
				}

				if (this.setCredentialType || (this.credentialData && this.credentialData.type)) {
					this.credentialType = this.setCredentialType || (this.credentialData && this.credentialData.type);
				}
			} else {
				// Make sure that it gets always reset else it uses by default
				// again the last selection from when it was open the previous time.
				this.credentialType = null;
			}
		},
	},
	methods: {
		getCredentialProperties (name: string): INodeProperties[] {
			const credentialsData = this.$store.getters.credentialType(name);

			if (credentialsData === null) {
				throw new Error(`Could not find credentials of type: ${name}`);
			}

			if (credentialsData.extends === undefined) {
				return credentialsData.properties;
			}

			const combineProperties = [] as INodeProperties[];
			for (const credentialsTypeName of credentialsData.extends) {
				const mergeCredentialProperties = this.getCredentialProperties(credentialsTypeName);
				NodeHelpers.mergeNodeProperties(combineProperties, mergeCredentialProperties);
			}

			// The properties defined on the parent credentials take presidence
			NodeHelpers.mergeNodeProperties(combineProperties, credentialsData.properties);

			return combineProperties;
		},
		getCredentialTypeData (name: string): ICredentialType | null {
			let credentialData = this.$store.getters.credentialType(name);

			if (credentialData === null || credentialData.extends === undefined) {
				return credentialData;
			}

			// Credentials extends another one. So get the properties of the one it
			// extends and add them.
			credentialData = JSON.parse(JSON.stringify(credentialData));
			credentialData.properties = this.getCredentialProperties(credentialData.name);

			return credentialData;
		},
		credentialsCreated (eventData: ICredentialsCreatedEvent): void {
			this.$emit('credentialsCreated', eventData);

			this.$showMessage({
				title: 'Credentials created',
				message: `The credential "${eventData.data.name}" got created!`,
				type: 'success',
			});

			if (eventData.options.closeDialog === true) {
				this.closeDialog();
			}
		},
		credentialsUpdated (eventData: ICredentialsCreatedEvent): void {
			this.$emit('credentialsUpdated', eventData);

			this.$showMessage({
				title: 'Credentials updated',
				message: `The credential "${eventData.data.name}" got updated!`,
				type: 'success',
			});

			if (eventData.options.closeDialog === true) {
				this.closeDialog();
			}
		},
		closeDialog (): void {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
		},
	},
});
</script>

<style lang="scss">

.credential-type-item {
	padding-bottom: 1em;
}

@media (min-width: 1200px){
	.titleContainer {
		display: flex;
		flex-direction: row;
		max-width: 100%;
		line-height: 17px;
	}

	#docsContainer {
		margin-left: auto;
		margin-right: 0;
	}
}

@media (max-width: 1199px){
	.titleContainer {
		display: flex;
		flex-direction: column;
		max-width: 100%;
		line-height: 17px;
	}

	#docsContainer {
		margin-top: 10px;
		margin-left: 0;
		margin-right: auto;
	}
}

#left {
	flex: 7;
	font-size: 16px;
	font-weight: bold;
	color: #7a7a7a;
	vertical-align:middle;
}

#right {
	vertical-align: middle;
	flex: 3;
	font-family: "Open Sans";
	color: #666666;
	font-size: 12px;
	font-weight: 510;
	letter-spacing: 0;
	display: flex;
	flex-direction: row;
	min-width: 40%;
}

#help-logo {
	flex: 1;
}

#docLinkText {
	margin-left: 2px;
	float: right;
	word-break: break-word;
	flex: 9;
}

#doc-hyperlink, #doc-hyperlink:visited, #doc-hyperlink:focus, #doc-hyperlink:active {
	text-decoration: none;
	color: #FF6150;
}



</style>
