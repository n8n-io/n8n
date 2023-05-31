<template>
	<div class="parameter-input-list-wrapper">
		<div
			v-for="(parameter, index) in filteredParameters"
			:key="parameter.name"
			:class="{ indent }"
			data-test-id="parameter-item"
		>
			<slot v-if="indexToShowSlotAt === index" />

			<div
				v-if="multipleValues(parameter) === true && parameter.type !== 'fixedCollection'"
				class="parameter-item"
			>
				<multiple-parameter
					:parameter="parameter"
					:values="getParameterValue(nodeValues, parameter.name, path)"
					:nodeValues="nodeValues"
					:path="getPath(parameter.name)"
					:isReadOnly="isReadOnly"
					@valueChanged="valueChanged"
				/>
			</div>

			<import-parameter
				v-else-if="
					parameter.type === 'curlImport' &&
					nodeTypeName === 'n8n-nodes-base.httpRequest' &&
					nodeTypeVersion >= 3
				"
				:isReadOnly="isReadOnly"
				@valueChanged="valueChanged"
			/>

			<n8n-notice
				v-else-if="parameter.type === 'notice'"
				class="parameter-item"
				:content="$locale.nodeText().inputLabelDisplayName(parameter, path)"
				@action="onNoticeAction"
			/>

			<div
				v-else-if="['collection', 'fixedCollection'].includes(parameter.type)"
				class="multi-parameter"
			>
				<div
					class="delete-option clickable"
					:title="$locale.baseText('parameterInputList.delete')"
					v-if="hideDelete !== true && !isReadOnly"
				>
					<font-awesome-icon
						icon="trash"
						class="reset-icon clickable"
						:title="$locale.baseText('parameterInputList.parameterOptions')"
						@click="deleteOption(parameter.name)"
					/>
				</div>
				<n8n-input-label
					:label="$locale.nodeText().inputLabelDisplayName(parameter, path)"
					:tooltipText="$locale.nodeText().inputLabelDescription(parameter, path)"
					size="small"
					:underline="true"
					color="text-dark"
				/>
				<collection-parameter
					v-if="parameter.type === 'collection'"
					:parameter="parameter"
					:values="getParameterValue(nodeValues, parameter.name, path)"
					:nodeValues="nodeValues"
					:path="getPath(parameter.name)"
					:isReadOnly="isReadOnly"
					@valueChanged="valueChanged"
				/>
				<fixed-collection-parameter
					v-else-if="parameter.type === 'fixedCollection'"
					:parameter="parameter"
					:values="getParameterValue(nodeValues, parameter.name, path)"
					:nodeValues="nodeValues"
					:path="getPath(parameter.name)"
					:isReadOnly="isReadOnly"
					@valueChanged="valueChanged"
				/>
			</div>
			<resource-mapper
				v-else-if="parameter.type === 'resourceMapper'"
				:parameter="parameter"
				:node="node"
				:path="getPath(parameter.name)"
				:dependentParametersValues="getDependentParametersValues(parameter)"
				inputSize="small"
				labelSize="small"
				@valueChanged="valueChanged"
			/>
			<div v-else-if="displayNodeParameter(parameter)" class="parameter-item">
				<div
					class="delete-option clickable"
					:title="$locale.baseText('parameterInputList.delete')"
					v-if="hideDelete !== true && !isReadOnly"
				>
					<font-awesome-icon
						icon="trash"
						class="reset-icon clickable"
						:title="$locale.baseText('parameterInputList.deleteParameter')"
						@click="deleteOption(parameter.name)"
					/>
				</div>

				<parameter-input-full
					:parameter="parameter"
					:hide-issues="hiddenIssuesInputs.includes(parameter.name)"
					:value="getParameterValue(nodeValues, parameter.name, path)"
					:displayOptions="shouldShowOptions(parameter)"
					:path="getPath(parameter.name)"
					:isReadOnly="isReadOnly"
					:hideLabel="false"
					:nodeValues="nodeValues"
					@valueChanged="valueChanged"
					@blur="onParameterBlur(parameter.name)"
				/>
			</div>
		</div>
		<div :class="{ indent }" v-if="filteredParameters.length === 0">
			<slot />
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import type { INodeParameters, INodeProperties, NodeParameterValue } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import type { INodeUi, IUpdateInformation } from '@/Interface';

import MultipleParameter from '@/components/MultipleParameter.vue';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ImportParameter from '@/components/ImportParameter.vue';
import ResourceMapper from '@/components/ResourceMapper/ResourceMapper.vue';
import { get, set } from 'lodash-es';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { isAuthRelatedParameter, getNodeAuthFields, getMainAuthField } from '@/utils';
import { KEEP_AUTH_IN_NDV_FOR_NODES } from '@/constants';

export default defineComponent({
	name: 'ParameterInputList',
	mixins: [workflowHelpers],
	components: {
		MultipleParameter,
		ParameterInputFull,
		FixedCollectionParameter: async () => import('./FixedCollectionParameter.vue'),
		CollectionParameter: async () => import('./CollectionParameter.vue'),
		ImportParameter,
		ResourceMapper,
	},
	props: {
		nodeValues: {
			type: Object as PropType<INodeParameters>,
			required: true,
		},
		parameters: {
			type: Array as PropType<INodeProperties[]>,
			required: true,
		},
		path: {
			type: String,
			default: '',
		},
		hideDelete: {
			type: Boolean,
			default: false,
		},
		indent: {
			type: Boolean,
			default: false,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		hiddenIssuesInputs: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore),
		nodeTypeVersion(): number | null {
			if (this.node) {
				return this.node.typeVersion;
			}
			return null;
		},
		nodeTypeName(): string {
			if (this.node) {
				return this.node.type;
			}
			return '';
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
		filteredParameters(): INodeProperties[] {
			return this.parameters.filter((parameter: INodeProperties) =>
				this.displayNodeParameter(parameter),
			);
		},
		filteredParameterNames(): string[] {
			return this.filteredParameters.map((parameter) => parameter.name);
		},
		node(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		nodeAuthFields(): INodeProperties[] {
			return getNodeAuthFields(this.nodeType);
		},
		indexToShowSlotAt(): number {
			let index = 0;
			// For nodes that use old credentials UI, keep credentials below authentication field in NDV
			// otherwise credentials will use auth filed position since the auth field is moved to credentials modal
			const fieldOffset = KEEP_AUTH_IN_NDV_FOR_NODES.includes(this.nodeType?.name || '') ? 1 : 0;
			const credentialsDependencies = this.getCredentialsDependencies();

			this.filteredParameters.forEach((prop, propIndex) => {
				if (credentialsDependencies.has(prop.name)) {
					index = propIndex + fieldOffset;
				}
			});

			return index < this.filteredParameters.length ? index : this.filteredParameters.length - 1;
		},
		mainNodeAuthField(): INodeProperties | null {
			return getMainAuthField(this.nodeType || undefined);
		},
	},
	methods: {
		onParameterBlur(parameterName: string) {
			this.$emit('parameterBlur', parameterName);
		},
		getCredentialsDependencies() {
			const dependencies = new Set();
			const nodeType = this.nodeTypesStore.getNodeType(
				this.node?.type || '',
				this.node?.typeVersion,
			);

			// Get names of all fields that credentials rendering depends on (using displayOptions > show)
			if (nodeType && nodeType.credentials) {
				for (const cred of nodeType.credentials) {
					if (cred.displayOptions && cred.displayOptions.show) {
						Object.keys(cred.displayOptions.show).forEach((fieldName) =>
							dependencies.add(fieldName),
						);
					}
				}
			}
			return dependencies;
		},
		multipleValues(parameter: INodeProperties): boolean {
			if (this.getArgument('multipleValues', parameter) === true) {
				return true;
			}
			return false;
		},
		getArgument(
			argumentName: string,
			parameter: INodeProperties,
		): string | string[] | number | boolean | undefined {
			if (parameter.typeOptions === undefined) {
				return undefined;
			}

			if (parameter.typeOptions[argumentName] === undefined) {
				return undefined;
			}

			return parameter.typeOptions[argumentName];
		},
		getPath(parameterName: string): string {
			return (this.path ? `${this.path}.` : '') + parameterName;
		},
		deleteOption(optionName: string): void {
			const parameterData = {
				name: this.getPath(optionName),
				value: undefined,
			};

			// TODO: If there is only one option it should delete the whole one

			this.$emit('valueChanged', parameterData);
		},

		mustHideDuringCustomApiCall(parameter: INodeProperties, nodeValues: INodeParameters): boolean {
			if (parameter && parameter.displayOptions && parameter.displayOptions.hide) return true;

			const MUST_REMAIN_VISIBLE = [
				'authentication',
				'resource',
				'operation',
				...Object.keys(nodeValues),
			];

			return !MUST_REMAIN_VISIBLE.includes(parameter.name);
		},
		displayNodeParameter(parameter: INodeProperties): boolean {
			if (parameter.type === 'hidden') {
				return false;
			}

			if (
				this.isCustomApiCallSelected(this.nodeValues) &&
				this.mustHideDuringCustomApiCall(parameter, this.nodeValues)
			) {
				return false;
			}

			// Hide authentication related fields since it will now be part of credentials modal
			if (
				!KEEP_AUTH_IN_NDV_FOR_NODES.includes(this.node?.type || '') &&
				this.mainNodeAuthField &&
				(parameter.name === this.mainNodeAuthField?.name ||
					this.shouldHideAuthRelatedParameter(parameter))
			) {
				return false;
			}

			if (parameter.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}

			const nodeValues: INodeParameters = {};
			let rawValues = this.nodeValues;
			if (this.path) {
				rawValues = get(this.nodeValues, this.path);
			}

			// Resolve expressions
			const resolveKeys = Object.keys(rawValues);
			let key: string;
			let i = 0;
			let parameterGotResolved = false;
			do {
				key = resolveKeys.shift() as string;
				if (typeof rawValues[key] === 'string' && rawValues[key].charAt(0) === '=') {
					// Contains an expression that
					if (
						rawValues[key].includes('$parameter') &&
						resolveKeys.some((parameterName) => rawValues[key].includes(parameterName))
					) {
						// Contains probably an expression of a missing parameter so skip
						resolveKeys.push(key);
						continue;
					} else {
						// Contains probably no expression with a missing parameter so resolve
						try {
							nodeValues[key] = this.resolveExpression(
								rawValues[key],
								nodeValues,
							) as NodeParameterValue;
						} catch (e) {
							// If expression is invalid ignore
							nodeValues[key] = '';
						}
						parameterGotResolved = true;
					}
				} else {
					// Does not contain an expression, add directly
					nodeValues[key] = rawValues[key];
				}
				// TODO: Think about how to calculate this best
				if (i++ > 50) {
					// Make sure we do not get caught
					break;
				}
			} while (resolveKeys.length !== 0);

			if (parameterGotResolved === true) {
				if (this.path) {
					rawValues = deepCopy(this.nodeValues);
					set(rawValues, this.path, nodeValues);
					return this.displayParameter(rawValues, parameter, this.path, this.node);
				} else {
					return this.displayParameter(nodeValues, parameter, '', this.node);
				}
			}

			return this.displayParameter(this.nodeValues, parameter, this.path, this.node);
		},
		valueChanged(parameterData: IUpdateInformation): void {
			this.$emit('valueChanged', parameterData);
		},
		onNoticeAction(action: string) {
			if (action === 'activate') {
				this.$emit('activate');
			}
		},
		isNodeAuthField(name: string): boolean {
			return this.nodeAuthFields.find((field) => field.name === name) !== undefined;
		},
		shouldHideAuthRelatedParameter(parameter: INodeProperties): boolean {
			// TODO: For now, hide all fields that are used in authentication fields displayOptions
			// Ideally, we should check if any non-auth field depends on it before hiding it but
			// since there is no such case, omitting it to avoid additional computation
			return isAuthRelatedParameter(this.nodeAuthFields, parameter);
		},
		shouldShowOptions(parameter: INodeProperties): boolean {
			return parameter.type !== 'resourceMapper';
		},
		getDependentParametersValues(parameter: INodeProperties): string | null {
			const loadOptionsDependsOn = this.getArgument('loadOptionsDependsOn', parameter) as
				| string[]
				| undefined;

			if (loadOptionsDependsOn === undefined) {
				return null;
			}

			// Get the resolved parameter values of the current node
			const currentNodeParameters = this.ndvStore.activeNode?.parameters;
			try {
				const resolvedNodeParameters = this.resolveParameter(currentNodeParameters);

				const returnValues: string[] = [];
				for (const parameterPath of loadOptionsDependsOn) {
					returnValues.push(get(resolvedNodeParameters, parameterPath) as string);
				}

				return returnValues.join('|');
			} catch (error) {
				return null;
			}
		},
	},
	watch: {
		filteredParameterNames(newValue, oldValue) {
			if (newValue === undefined) {
				return;
			}
			// After a parameter does not get displayed anymore make sure that its value gets removed
			// Is only needed for the edge-case when a parameter gets displayed depending on another field
			// which contains an expression.
			for (const parameter of oldValue) {
				if (!newValue.includes(parameter)) {
					const parameterData = {
						name: `${this.path}.${parameter}`,
						node: this.ndvStore.activeNode?.name || '',
						value: undefined,
					};
					this.$emit('valueChanged', parameterData);
				}
			}
		},
	},
});
</script>

<style lang="scss">
.parameter-input-list-wrapper {
	.delete-option {
		display: none;
		position: absolute;
		z-index: 999;
		color: #f56c6c;
		font-size: var(--font-size-2xs);

		&:hover {
			color: #ff0000;
		}
	}

	.indent > div {
		padding-left: var(--spacing-s);
	}

	.multi-parameter {
		position: relative;
		margin: var(--spacing-xs) 0;

		.delete-option {
			top: 0;
			left: 0;
		}

		.parameter-info {
			display: none;
		}
	}

	.parameter-item {
		position: relative;
		margin: var(--spacing-xs) 0;

		> .delete-option {
			top: var(--spacing-5xs);
			left: 0;
		}
	}
	.parameter-item:hover > .delete-option,
	.multi-parameter:hover > .delete-option {
		display: block;
	}

	.parameter-notice {
		background-color: var(--color-warning-tint-2);
		color: $custom-font-black;
		margin: 0.3em 0;
		padding: 0.7em;

		a {
			font-weight: var(--font-weight-bold);
		}
	}
}
</style>
