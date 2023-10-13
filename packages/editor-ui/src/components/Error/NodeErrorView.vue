<template>
	<div class="node-error-view">
		<div class="error-header">
			<div class="error-header__message">
				{{ getErrorMessage() }}
			</div>
			<div
				class="error-header__description"
				v-if="error.description"
				v-html="getErrorDescription()"
			></div>
		</div>

		<details class="error-details" open v-if="error.httpCode">
			<summary class="error-details__summary">
				<font-awesome-icon class="error-details__icon" icon="angle-right" />
				{{ error.node.name }} error details
			</summary>
			<div class="error-details__content">
				<div class="error-details__content-row" v-if="error.httpCode">
					<p class="error-details__content-label">Error code</p>
					<p class="error-details__content-value">
						<code>{{ error.httpCode }}</code>
					</p>
				</div>
				<div class="error-details__content-row" v-if="error.description">
					<p class="error-details__content-label">Full message</p>
					<p class="error-details__content-value">
						<code>{{ error.description }}</code>
					</p>
				</div>
			</div>
		</details>

		<details class="error-details" open>
			<summary class="error-details__summary">
				<font-awesome-icon class="error-details__icon" icon="angle-right" />Info
			</summary>
			<div class="error-details__content">
				<div class="error-details__content-row" v-if="error.timestamp">
					<p class="error-details__content-label">{{ $locale.baseText('nodeErrorView.time') }}</p>
					<p class="error-details__content-value">
						<code>{{ new Date(error.timestamp).toLocaleString() }}</code>
					</p>
				</div>
				<div
					class="error-details__content-row"
					v-if="error.context && error.context.itemIndex !== undefined"
				>
					<p class="error-details__content-label">
						{{ $locale.baseText('nodeErrorView.itemIndex') }}
					</p>
					<p class="error-details__content-value">
						<code>{{ error.context.itemIndex }}</code>
					</p>
				</div>
				<div
					class="error-details__content-row"
					v-if="error.context && error.context.runIndex !== undefined"
				>
					<p class="error-details__content-label">Run</p>
					<p class="error-details__content-value">
						<code>{{ error.context.runIndex }}</code>
					</p>
				</div>
				<div
					class="error-details__content-row"
					v-if="error.context && error.context.parameter !== undefined"
				>
					<p class="error-details__content-label">
						{{ $locale.baseText('nodeErrorView.inParameter') }}
					</p>
					<p class="error-details__content-value">
						<code>{{ parameterDisplayName(error.context.parameter) }}</code>
					</p>
				</div>
			</div>
		</details>

		<details class="error-details" v-if="error.stack">
			<summary class="error-details__summary">
				<font-awesome-icon class="error-details__icon" icon="angle-right" />n8n stacktrace
			</summary>
			<div class="error-details__content">
				<div class="error-details__content-row">
					<pre class="error-details__content-value"><code>{{ error.stack }}</code></pre>
				</div>
			</div>
		</details>

		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<br />
		<hr />
		<br />
		<p>Ignore the stuff below</p>
		<br />
		<br />

		<details class="error-details">
			<summary class="error-details__summary">
				<font-awesome-icon class="error-details__icon" icon="angle-right" />Only for this feature
				debugging!
			</summary>
			<div class="error-details__content">
				<div class="error-details__content-row">
					<pre class="error-details__content-value"><code>{{ error }}</code></pre>
				</div>
			</div>
		</details>

		<details>
			<summary class="error-details__summary">
				<font-awesome-icon class="error-details__icon" icon="angle-right" />
				{{ $locale.baseText('nodeErrorView.details') }}
			</summary>
			<div class="error-details__content">
				<div v-if="error.context && error.context.causeDetailed">
					<el-card class="box-card" shadow="never">
						<div>
							{{ error.context.causeDetailed }}
						</div>
					</el-card>
				</div>

				<div v-if="error.cause">
					<el-card class="box-card" shadow="never">
						<template #header>
							<div class="clearfix box-card__title">
								<span>{{ $locale.baseText('nodeErrorView.cause') }}</span>
								<br />
								<span class="box-card__subtitle">{{
									$locale.baseText('nodeErrorView.dataBelowMayContain')
								}}</span>
							</div>
						</template>
						<div>
							<div class="copy-button" v-if="displayCause">
								<n8n-icon-button
									@click="copyCause"
									:title="$locale.baseText('nodeErrorView.copyToClipboard')"
									icon="copy"
								/>
							</div>
							<vue-json-pretty
								v-if="displayCause"
								:data="error.cause"
								:deep="3"
								:showLength="true"
								selectableType="single"
								path="error"
								class="json-data"
							/>
							<span v-else>
								<font-awesome-icon icon="info-circle" />{{
									$locale.baseText('nodeErrorView.theErrorCauseIsTooLargeToBeDisplayed')
								}}
							</span>
						</div>
					</el-card>
				</div>
			</div>
		</details>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import VueJsonPretty from 'vue-json-pretty';
import { copyPaste } from '@/mixins/copyPaste';
import { useToast } from '@/composables';
import { MAX_DISPLAY_DATA_SIZE } from '@/constants';

import {
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	jsonParse,
} from 'n8n-workflow';
import { sanitizeHtml } from '@/utils';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export default defineComponent({
	name: 'NodeErrorView',
	mixins: [copyPaste],
	props: ['error'],
	components: {
		VueJsonPretty,
	},
	setup() {
		return {
			...useToast(),
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore),
		displayCause(): boolean {
			return JSON.stringify(this.error.cause).length < MAX_DISPLAY_DATA_SIZE;
		},
		parameters(): INodeProperties[] {
			const node = this.ndvStore.activeNode;
			if (!node) {
				return [];
			}
			const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

			if (nodeType === null) {
				return [];
			}

			return nodeType.properties;
		},
	},
	methods: {
		replacePlaceholders(parameter: string, message: string): string {
			const parameterName = this.parameterDisplayName(parameter, false);
			const parameterFullName = this.parameterDisplayName(parameter, true);
			return message
				.replace(/%%PARAMETER%%/g, parameterName)
				.replace(/%%PARAMETER_FULL%%/g, parameterFullName);
		},
		getErrorDescription(): string {
			if (!this.error.context || !this.error.context.descriptionTemplate) {
				return sanitizeHtml(this.error.description);
			}

			const parameterName = this.parameterDisplayName(this.error.context.parameter);
			return sanitizeHtml(
				this.error.context.descriptionTemplate.replace(/%%PARAMETER%%/g, parameterName),
			);
		},
		getErrorMessage(): string {
			const baseErrorMessage = '';

			if (!this.error.context || !this.error.context.messageTemplate) {
				return baseErrorMessage + this.error.message;
			}

			const parameterName = this.parameterDisplayName(this.error.context.parameter);

			return (
				baseErrorMessage +
				this.error.context.messageTemplate.replace(/%%PARAMETER%%/g, parameterName)
			);
		},
		parameterDisplayName(path: string, fullPath = true) {
			try {
				const parameters = this.parameterName(this.parameters, path.split('.'));
				if (!parameters.length) {
					throw new Error();
				}

				if (fullPath === false) {
					return parameters.pop()!.displayName;
				}
				return parameters.map((parameter) => parameter.displayName).join(' > ');
			} catch (error) {
				return `Could not find parameter "${path}"`;
			}
		},
		parameterName(
			parameters: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>,
			pathParts: string[],
		): Array<INodeProperties | INodePropertyCollection> {
			let currentParameterName = pathParts.shift();

			if (currentParameterName === undefined) {
				return [];
			}

			const arrayMatch = currentParameterName.match(/(.*)\[([\d])\]$/);
			if (arrayMatch !== null && arrayMatch.length > 0) {
				currentParameterName = arrayMatch[1];
			}
			const currentParameter = parameters.find(
				(parameter) => parameter.name === currentParameterName,
			) as unknown as INodeProperties | INodePropertyCollection;

			if (currentParameter === undefined) {
				throw new Error(`Could not find parameter "${currentParameterName}"`);
			}

			if (pathParts.length === 0) {
				return [currentParameter];
			}

			if (currentParameter.hasOwnProperty('options')) {
				return [
					currentParameter,
					...this.parameterName((currentParameter as INodeProperties).options!, pathParts),
				];
			}

			if (currentParameter.hasOwnProperty('values')) {
				return [
					currentParameter,
					...this.parameterName((currentParameter as INodePropertyCollection).values, pathParts),
				];
			}

			// We can not resolve any deeper so lets stop here and at least return hopefully something useful
			return [currentParameter];
		},
		copyCause() {
			this.copyToClipboard(JSON.stringify(this.error.cause));
			this.copySuccess();
		},
		copySuccess() {
			this.showMessage({
				title: this.$locale.baseText('nodeErrorView.showMessage.title'),
				type: 'info',
			});
		},
	},
});
</script>

<style lang="scss">
.node-error-view {
	// margin: 0 var(--font-size-2xl);
}

.error-header {
	padding: var(--spacing-l);
	margin-bottom: var(--spacing-l);
	background-color: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-large);

	&__message {
		color: var(--color-primary);
		font-weight: bold;
		font-size: var(--font-size-s);
	}
	&__description {
		margin-top: var(--spacing-xs);
		font-size: var(--font-size-s);
	}
}

.error-details {
	margin-bottom: var(--spacing-s);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-large);

	&__summary {
		padding: var(--spacing-xs) var(--spacing-l);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		// color: var(--color-text-dark);
		color: var(--color-text);
		cursor: pointer;
		outline: none;
		background: var(--color-background-light);
		border-radius: var(--border-radius-large);
	}

	&__icon {
		margin-right: var(--spacing-xs);
	}

	&__content {
	}

	&__content-row {
		display: flex;
		padding: var(--spacing-xs) var(--spacing-l);
		border-top: 1px solid var(--color-foreground-base);
	}

	&__content-label {
		flex-grow: 0;
		flex-shrink: 0;
		width: 120px;
		color: var(--color-text);
		font-size: var(--font-size-xs);
	}

	&__content-value {
		flex: 1;
		overflow: hidden;
		margin-right: auto;
		color: var(--color-text);
		font-size: var(--font-size-xs);

		code {
			color: var(--color-json-string);
			text-wrap: wrap;
		}
	}
}

details > summary {
	list-style-type: none;
}

details > summary::-webkit-details-marker {
	display: none;
}

details[open] {
	.error-details__summary {
		border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
	}

	.error-details__icon {
		transform: rotate(90deg);
	}
}

.el-divider__text {
	background-color: var(--color-background-light);
}

.box-card {
	margin-top: 1em;
	overflow: auto;
}

.box-card__title {
	font-weight: 400;
}

.box-card__subtitle {
	font-weight: 200;
	font-style: italic;
	font-size: 0.7rem;
}

.copy-button {
	position: absolute;
	right: 50px;
	z-index: 1000;
}
</style>
