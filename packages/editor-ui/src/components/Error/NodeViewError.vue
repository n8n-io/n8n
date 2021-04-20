<template>
	<div>
		<div class="error-header">
			<div class="error-message">ERROR: {{error.message}}</div>
			<div class="error-description" v-if="error.description">{{error.description}}</div>
		</div>
		<details>
			<summary class="error-details__summary">
				<font-awesome-icon class="error-details__icon" icon="angle-right" /> Details
			</summary>
			<div class="error-details__content">
				<div v-if="error.timestamp">
					<el-card class="box-card" shadow="never">
						<div slot="header" class="clearfix box-card__title">
							<span>Time</span>
						</div>
						<div>
							{{new Date(error.timestamp).toLocaleString()}}
						</div>
					</el-card>
				</div>
				<div v-if="error.httpCode">
					<el-card class="box-card" shadow="never">
						<div slot="header" class="clearfix box-card__title">
							<span>HTTP-Code</span>
						</div>
						<div>
							{{error.httpCode}}
						</div>
					</el-card>
				</div>
				<div v-if="error.cause">
					<el-card class="box-card" shadow="never">
						<div slot="header" class="clearfix box-card__title">
							<span>Cause</span>
							<br>
							<span class="box-card__subtitle">Data below may contain sensitive information. Proceed with caution when sharing.</span>
						</div>
						<div>
							<el-button class="copy-button" @click="copyCause" circle type="text" title="Copy to clipboard">
								<font-awesome-icon icon="copy" />
							</el-button>
							<vue-json-pretty
								:data="error.cause"
								:deep="3"
								:showLength="true"
								selectableType="single"
								path="error"
								class="json-data"
							/>
						</div>
					</el-card>
				</div>
				<div v-if="error.stack">
					<el-card class="box-card" shadow="never">
						<div slot="header" class="clearfix box-card__title">
							<span>Stack</span>
						</div>
						<div>
							<pre><code>{{error.stack}}</code></pre>
						</div>
					</el-card>
				</div>
			</div>
		</details>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
//@ts-ignore
import VueJsonPretty from 'vue-json-pretty';
import { copyPaste } from '@/components/mixins/copyPaste';
import { showMessage } from '@/components/mixins/showMessage';
import mixins from 'vue-typed-mixins';


export default mixins(
	copyPaste,
	showMessage,
).extend({
	name: 'NodeErrorView',
	props: [
		'error',
	],
	components: {
		VueJsonPretty,
	},
	methods: {
		copyCause() {
			this.copyToClipboard(JSON.stringify(this.error.cause));
			this.copySuccess();
		},
		copySuccess() {
			this.$showMessage({
				title: 'Copied to clipboard',
				message: '',
				type: 'info',
			});
		},
	},
});
</script>

<style lang="scss">

.error-header {
	margin-bottom: 10px;
}

.error-message {
	color: #ff0000;
	font-weight: bold;
	font-size: 1.1rem;
}

.error-description {
	margin-top: 10px;
	font-size: 1rem;
}

.error-details__summary {
	font-weight: 600;
	font-size: 16px;
	cursor: pointer;
	outline:none;
}

.error-details__icon {
	margin-right: 4px;
}

details > summary {
    list-style-type: none;
}

details > summary::-webkit-details-marker {
    display: none;
}

details[open] {
  .error-details__icon {
		transform: rotate(90deg);
	}
}

.error-details__content {
	margin-top: 15px;
}

.el-divider__text {
	background-color: #f9f9f9;
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
	font-size: 1.1rem;
	right: 50px;
	z-index: 1000;
}

</style>
