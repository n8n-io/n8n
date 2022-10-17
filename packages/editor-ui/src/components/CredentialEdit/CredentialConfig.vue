<template>
	<div :class="$style.container">
		<banner
			v-show="showValidationWarning"
			theme="danger"
			:message="$locale.baseText('credentialEdit.credentialConfig.pleaseCheckTheErrorsBelow')"
		/>

		<banner
			v-if="authError && !showValidationWarning"
			theme="danger"
			:message="$locale.baseText('credentialEdit.credentialConfig.couldntConnectWithTheseSettings')"
			:details="authError"
			:buttonLabel="$locale.baseText('credentialEdit.credentialConfig.retry')"
			buttonLoadingLabel="Retrying"
			:buttonTitle="$locale.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<banner
			v-show="showOAuthSuccessBanner && !showValidationWarning"
			theme="success"
			:message="$locale.baseText('credentialEdit.credentialConfig.accountConnected')"
			:buttonLabel="$locale.baseText('credentialEdit.credentialConfig.reconnect')"
			:buttonTitle="$locale.baseText('credentialEdit.credentialConfig.reconnectOAuth2Credential')"
			@click="$emit('oauth')"
		/>

		<banner
			v-show="testedSuccessfully && !showValidationWarning"
			theme="success"
			:message="$locale.baseText('credentialEdit.credentialConfig.connectionTestedSuccessfully')"
			:buttonLabel="$locale.baseText('credentialEdit.credentialConfig.retry')"
			:buttonLoadingLabel="$locale.baseText('credentialEdit.credentialConfig.retrying')"
			:buttonTitle="$locale.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<template v-if="credentialPermissions.updateConnection">
			<n8n-notice v-if="documentationUrl && credentialProperties.length" theme="warning">
				{{ $locale.baseText('credentialEdit.credentialConfig.needHelpFillingOutTheseFields') }}
				<span class="ml-4xs">
					<n8n-link :to="documentationUrl" size="small" bold @click="onDocumentationUrlClick">
						{{ $locale.baseText('credentialEdit.credentialConfig.openDocs') }}
					</n8n-link>
				</span>
			</n8n-notice>
		</template>
		<CopyInput
			v-if="isOAuthType && credentialProperties.length && showCredentialInput"
			:label="$locale.baseText('credentialEdit.credentialConfig.oAuthRedirectUrl')"
			:value="oAuthCallbackUrl"
			:copyButtonText="$locale.baseText('credentialEdit.credentialConfig.clickToCopy')"
			:hint="$locale.baseText('credentialEdit.credentialConfig.subtitle', { interpolate: { appName } })"
			:toastTitle="$locale.baseText('credentialEdit.credentialConfig.redirectUrlCopiedToClipboard')"
		/>
		<CopyInput
			v-else-if="isGoogleServiceAccount"
			label="Service Account Email"
			value="marketing-master-io@fb-marketing-master.iam.gserviceaccount.com"
			copyButtonText="Click to copy"
			hint="Add our Service Account Email as an admin to your Google resource"
			toastTitle="Successfully copied the Service Account Email"
		/>

		<CredentialInputs
			v-if="credentialType && showCredentialInput && credentialPermissions.updateConnection"
			:credentialData="credentialData"
			:credentialProperties="credentialProperties"
			:documentationUrl="documentationUrl"
			:showValidationWarnings="showValidationWarning"
			@change="onDataChange"
		/>

		<OauthButton
			v-if="isOAuthType && requiredPropertiesFilled && !isOAuthConnected && credentialPermissions.isOwner"
			:isGoogleOAuthType="isGoogleOAuthType"
			@click="$emit('oauth')"
		/>

		<n8n-text v-if="!credentialType" color="text-base" size="medium">
			{{ $locale.baseText('credentialEdit.credentialConfig.missingCredentialType') }}
		</n8n-text>
	</div>
</template>

<script lang="ts">
import { ICredentialType } from 'n8n-workflow';
import { getAppNameFromCredType, isCommunityPackageName } from '../helpers';

import Banner from '../Banner.vue';
import CopyInput from '../CopyInput.vue';
import CredentialInputs from './CredentialInputs.vue';
import OauthButton from './OauthButton.vue';
import { restApi } from '@/components/mixins/restApi';
import { addCredentialTranslation } from '@/plugins/i18n';
import mixins from 'vue-typed-mixins';
import { BUILTIN_CREDENTIALS_DOCS_URL, EnterpriseEditionFeature } from '@/constants';
import { IPermissions } from "@/permissions";

export default mixins(restApi).extend({
	name: 'CredentialConfig',
	components: {
		Banner,
		CopyInput,
		CredentialInputs,
		OauthButton,
	},
	props: {
		credentialType: {
			type: Object,
		},
		credentialProperties: {
			type: Array,
		},
		parentTypes: {
			type: Array,
		},
		credentialData: {
		},
		credentialId: {
			type: [String, Number],
			default: '',
		},
		showValidationWarning: {
			type: Boolean,
			default: false,
		},
		authError: {
			type: String,
		},
		testedSuccessfully: {
			type: Boolean,
		},
		isOAuthType: {
			type: Boolean,
		},
		isOAuthConnected: {
			type: Boolean,
		},
		isRetesting: {
			type: Boolean,
		},
		credentialPermissions: {
			type: Object,
			default: (): IPermissions => ({}),
		},
		requiredPropertiesFilled: {
			type: Boolean,
		},
	},
	data() {
		return {
			EnterpriseEditionFeature,
		};
	},
	async beforeMount() {
		if (this.$store.getters.defaultLocale === 'en') return;

		this.$store.commit('setActiveCredentialType', this.credentialType.name);

		const key = `n8n-nodes-base.credentials.${this.credentialType.name}`;

		if (this.$locale.exists(key)) return;

		const credTranslation = await this.restApi().getCredentialTranslation(this.credentialType.name);

		addCredentialTranslation(
			{ [this.credentialType.name]: credTranslation },
			this.$store.getters.defaultLocale,
		);
	},
	computed: {
		appName(): string {
			if (!this.credentialType) {
				return '';
			}

			const appName = getAppNameFromCredType(
				(this.credentialType as ICredentialType).displayName,
			);

			return appName || this.$locale.baseText('credentialEdit.credentialConfig.theServiceYouReConnectingTo');
		},
		credentialTypeName(): string {
			return (this.credentialType as ICredentialType).name;
		},
		credentialOwnerName(): string {
			return this.$store.getters['credentials/getCredentialOwnerName'](this.credentialId);
		},
		documentationUrl(): string {
			const type = this.credentialType as ICredentialType;
			const activeNode = this.$store.getters.activeNode;
			const isCommunityNode = activeNode ? isCommunityPackageName(activeNode.type) : false;

			if (!type || !type.documentationUrl) {
				return '';
			}

			if (type.documentationUrl.startsWith('https://') || type.documentationUrl.startsWith('http://')) {
				return type.documentationUrl;
			}

			return isCommunityNode ?
				'' : // Don't show documentation link for community nodes if the URL is not an absolute path
				`${BUILTIN_CREDENTIALS_DOCS_URL}${type.documentationUrl}/?utm_source=n8n_app&utm_medium=left_nav_menu&utm_campaign=create_new_credentials_modal`;
		},
		isGoogleOAuthType(): boolean {
			return this.credentialTypeName === 'googleOAuth2Api' || this.parentTypes.includes('googleOAuth2Api');
		},
		oAuthCallbackUrl(): string {
			const oauthType =
				this.credentialTypeName === 'oAuth2Api' ||
				this.parentTypes.includes('oAuth2Api')
					? 'oauth2'
					: 'oauth1';
			return this.$store.getters.oauthCallbackUrls[oauthType];
		},
		showOAuthSuccessBanner(): boolean {
			return this.isOAuthType && this.requiredPropertiesFilled && this.isOAuthConnected && !this.authError;
		},
		showCredentialInput(): boolean {
			if(!this.credentialType){
				return false;
			}
			if(!this.isAdmin && this.isGoogleOAuthType){
				return false;
			}
			if(!this.isAdmin && this.isGoogleServiceAccount){
				return false;
			}
			return true;
		},
		isAdmin(): boolean {
			const {users,currentUserId} = this.$store.state.users;
			const user = users[currentUserId];
			return user.globalRole.name === 'owner';
		},
		isGoogleServiceAccount(): boolean {
			return !!(this.credentialType.name === 'googleApi' && !!this.credentialType.properties.some(
				// @ts-ignore
				prop => prop.name === 'privateKey',
			));
		},
	},
	methods: {
		onDataChange (event: { name: string; value: string | number | boolean | Date | null }): void {
			this.$emit('change', event);
		},
		onDocumentationUrlClick (): void {
			this.$telemetry.track('User clicked credential modal docs link', {
				docs_link: this.documentationUrl,
				credential_type: this.credentialTypeName,
				source: 'modal',
				workflow_id: this.$store.getters.workflowId,
			});
		},
	},
	mounted(){
		if(!!this.isGoogleOAuthType){
			this.$emit('change', {
				"name": "clientSecret",
				"value": "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",
			});
			this.$emit('change', {
				"name": "clientId",
				"value": "309632529461-13c7jcf902fvf7lkcubq9sh8mbbbikaq.apps.googleusercontent.com",
			});
		}
		else if (this.isGoogleServiceAccount){
			this.$emit('change', {
				"name": "email",
				"value": "marketing-master-io@fb-marketing-master.iam.gserviceaccount.com",
			});
			this.$emit('change', {
				"name": "privateKey",
				"value": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHMEOVK2U63Spm\nnhiTnuucr/+iz+GKWGjXkw8BSFYSLTbiWvM7ExNCNJyE0szEtwoe/pBYSS2RssnO\nYXk1YrPoE3asqaXRcteJRUSw08fFsjStWZX4UPfmAyMA6cgi+c5CpvDvS3+yBkLi\nCcI7S8FQ7tzodXexKR7iukIpMkop9dh1ZApaHS3WHrqT6BN9yQ8EqKES4iX8I71n\n392rmIyn7Lc7VVLlLimIbUFMuSP3HbRA1oYU/ob7acFUKztgSVCauvOryt2vknDu\nbUiRZGGiN0Q7vv20Jv0iV57cl5MbAjNg4Z6PBpTP3TBhXbPiMul5atnAmKgr2i0e\nFRVhLGv/AgMBAAECggEABtP5Rf6Otz29Zj4FXlIX9/1kgTDTUFFOazDvARPq8Evn\n0hHq9iKs7Y2ClrRZ2/MZ45s3dQ2G6AlaKWW7jA6cOxFgoCyYJKwBsQKbo6Ou3Kl8\nbJDTtyO+hJrBz6SJRI/jaZ248xIeswpZ5+u3RgHAPCkAc5m9Br44q9Gq7yglKnc5\nDD5XYLIIwkhMRAleF8tFbRfOyL7eAyigiZ/xSfl+LIqtPcbHf0RKX+/Vt0BP+p01\nQo96OgMwrlHD+x5HxARhq1PvzQTMkUvHn32dSsJ8P07L4FNxGSQ+HM+t2OVEZ02V\nrUOzfY0Ifv2F2xRHrWuttUdxDvwekBduTHbJ59rCmQKBgQD/Hz6KkpfATebmmpCL\n89KcB82NEwtEo0oYQ1iw2Ggfl1dyQ9FYwYYCkVn5Zfg4C1hOo5lnkpBmFTnK5ENJ\nsGuiYJh33WglrtMX7UoONBvCtgYLDYkBwKeIsI2X+uF95PdjeV6YMd79LI/IFk1j\nhaI/G2hyDePWr+Gh69n8W1Jc0wKBgQDH375nIt0rgUksx9b9Pu2Ppkas+WJCPdI/\nWspg9hIcSAgRwCuey4UfACRtCj17rHsgiO889HLpVW4ISkwfDoSkxt9jmk3s4OpK\npBZqBGArjPLVIRHzyAsRafNA0WCy1KcEgRBNiuqcIUfd2T962WdMgDDO91X/j2tg\nMpNOJxAIpQKBgQDAi54yC41IcAMSjBkH509Ov3zdOkBI30xun3VykwGSxjATZye6\n6uPvUDAt0E3UToupXkPLLYyZ3u8tN7WpCeNSO8EWxh1yQ03CQy6fJajF/Yb2FJMQ\npYxL16Qlzg0dbQ9hHhrMlucLAPTLODnUIOlg45iia+VHBJswD8cHdQzmTQKBgFs8\nA3KalHBWXGuHcNg6UEAA+0PbtgFcrMrki3qE+DFWo/BOUtryNXq4Guh3AyefzLhG\nKUYeoxFlQIuiNmr6uotoh/G0LpvQ8sFNcznDc46NkQ6+QK6RgpPZVAMjT8txjCdf\nLmzm2z6XZnGayAIwmJlv7leayPOVqMLJczn6VLRNAoGAFAC6GH79g2YPE/a5jcJO\nDJ9o2G/Z5try9DpP4MJ4g4JM4YKavMlZhxAta/QDf31Pv1HjrkOg47flwUsOnKcB\nuU+3yEsjPlriF/k2nRYPjAaUnTx0YSqR0VFJFzTmpLz+xgqYKLNnpnAZ241LepsR\n4pzXo08MTiTKP6j9oZhw/YA=\n-----END PRIVATE KEY-----",
			});
		}
	},
	watch: {
		showOAuthSuccessBanner(newValue, oldValue) {
			if (newValue && !oldValue) {
				this.$emit('scrollToTop');
			}
		},
	},
});
</script>

<style lang="scss" module>
.container {
	--notice-margin: 0;
	> * {
		margin-bottom: var(--spacing-l);
	}
}

</style>