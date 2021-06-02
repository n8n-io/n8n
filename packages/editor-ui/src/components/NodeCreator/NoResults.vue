<template>
	<div class="no-results">
		<div class="img">
			<img :src="`${basePath}no-nodes-icon.png`" alt="" />
		</div>
		<div class="title">
			<div>We didn't make that... yet</div>
			<div class="action">
				Don’t worry, you can probably do it with the
				<a @click="selectHttpRequest">HTTP Request</a> or
				<a @click="selectWebhook">Webhook</a> node
			</div>
		</div>

		<div class="action">
			<div>Want us to make it faster?</div>
			<div>
				<a
					href="https://n8n-community.typeform.com/to/K1fBVTZ3"
					target="_blank"
				>
					<span>Request the node</span>&nbsp;
					<span>
						<font-awesome-icon
							icon="external-link-alt"
							title="Request the node"
						/>
					</span>
				</a>
			</div>
		</div>
	</div>
</template>


<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: "NodeCreateList",
	computed: {
		basePath(): string {
			return this.$store.getters.getBaseUrl;
		},
	},
	methods: {
		selectWebhook() {
			this.$emit("nodeTypeSelected", "n8n-nodes-base.webhook");
		},

		selectHttpRequest() {
			this.$emit("nodeTypeSelected", "n8n-nodes-base.httpRequest");
		},
	},
});
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}

.no-results {
	background-color: #f8f9fb;
	text-align: center;
	height: 100%;
	border-left: 1px solid $--node-creator-border-color;
	padding: 100px 56px 60px 56px;
	display: flex;
	flex-direction: column;

	.title {
		font-size: 22px;
		line-height: 16px;
		margin-top: 50px;
		margin-bottom: 200px;

		div {
			margin-bottom: 15px;
		}
	}

	.action {
		font-size: 14px;
		line-height: 19px;
	}

	a {
		font-weight: 600;
		color: $--color-primary;
		text-decoration: none;
		cursor: pointer;
	}

	img {
		min-height: 67px;
	}
}
</style>