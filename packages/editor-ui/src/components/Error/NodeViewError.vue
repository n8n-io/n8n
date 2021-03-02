<template>
  <div>
		<div class="error-header">
  	  <div class="error-message">ERROR: {{error.message}}</div>
			<div class="error-description" v-if="error.description">{{error.description}}</div>
		</div>
		<el-button v-if="!showFullError" @click="revealError()">Show Details</el-button>
		<div v-if="showFullError" class="error-details">
			<el-divider content-position="left">Error details</el-divider>
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
							:deep="10"
							:showLength="true"
							selectableType="single"
							path="error"
							class="json-data"
						/>
					</div>
				</el-card>
			</div>
		</div>
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
	data () {
		return {
			showFullError: false,
		};
	},
	computed: {},
	methods: {
		revealError() {
			this.showFullError = true;
			console.log(this.error.stack);
		},
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
	margin-bottom: 50px;
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

.error-details {
	margin-top: 50px;
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
