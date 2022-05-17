<template>
	<div>
		<div class="parameter-value-container">
			<n8n-select
				:size="inputSize"
				filterable
				:value="displayValue"
				:placeholder="parameter.placeholder ? getPlaceholder() : $locale.baseText('parameterInput.select')"
				:loading="remoteParameterOptionsLoading"
				:disabled="isReadOnly || remoteParameterOptionsLoading"
				:title="displayTitle"
				@change="valueChanged"
				@keydown.stop
				@focus="setFocus"
				@blur="onBlur"
			>
				<n8n-option
					v-for="credType in supportedCredentialTypes"
					:value="credType.name"
					:key="credType.name"
				>
					<div class="list-option">
						<div class="option-headline">
							{{ credType.displayName }}
						</div>
						<div
							v-if="credType.description"
							class="option-description"
							v-html="credType.description"
						/>
					</div>
				</n8n-option>
			</n8n-select>
			<slot name="issues-and-options" />
		</div>

		<scopes-notice
			v-if="activeCredential.scopes.length > 0"
			:scopes="activeCredential.scopes"
			:shortCredentialDisplayName="activeCredential.shortDisplayName"
		/>
		<div>
			<node-credentials
				:node="node"
				:overrideCredType="node.parameters.nodeCredentialType"
				@credentialSelected="credentialSelected"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { ICredentialType } from 'n8n-workflow';
import Vue from 'vue';
import { mapGetters } from 'vuex';
import ScopesNotice from '@/components/ScopesNotice.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';

export default Vue.extend({
	name: 'NodeCredentialType',
	components: {
		ScopesNotice,
		NodeCredentials,
	},
	props: [
		'node',
		'credentialSelected',
		'parameter',
		'activeCredential',
		'inputSize',
		'displayValue',
		'remoteParameterOptionsLoading',
		'isReadOnly',
		'displayTitle',
		'valueChanged',
		'setFocus',
		'onBlur',
	],
	computed: {
		...mapGetters('credentials', ['allCredentialTypes']),
		supportedCredentialTypes(): ICredentialType[] {
			return this.allCredentialTypes.filter((c: ICredentialType) => this.supportsProxyAuth(c.name));
		},
	},
	methods: {
		supportsProxyAuth(name: string): boolean {
			if (this.parameter.type !== 'nodeCredentialType') return false;

			// edge case: `httpHeaderAuth` has `authenticate` auth but belongs to generic auth
			if (name === 'httpHeaderAuth') return false;

			const supported = this.getSupportedCredentialTypes(this.parameter.credentialTypes);

			const credType = this.$store.getters['credentials/getCredentialTypeByName'](name);

			for (const property of supported.has) {
				if (credType[property] !== undefined) return true;
			}

			if (
				credType.extends &&
				credType.extends.some(
					(parentType: string) => supported.extends.includes(parentType),
				)
			) {
				return true;
			}

			if (credType.extends) {
				return credType.extends.reduce(
					(acc: boolean, parentType: string) => acc || this.supportsProxyAuth(parentType),
					false,
				);
			}

			return false;
		},
		getSupportedCredentialTypes(credentialTypes: string[]) {
			return credentialTypes.reduce<{ extends: string[]; has: string[] }>((acc, cur) => {
				const _extends = cur.split('extends:');

				if (_extends.length === 2) {
					acc.extends.push(_extends[1]);
					return acc;
				}

				const _has = cur.split('has:');

				if (_has.length === 2) {
					acc.has.push(_has[1]);
					return acc;
				}

				return acc;
			}, { extends: [], has: [] });
		},
	},
});
</script>

<style lang="scss">
.parameter-value-container {
	display: flex;
	align-items: center;
}

.parameter-issues {
	padding-left: 5px;
}

</style>
