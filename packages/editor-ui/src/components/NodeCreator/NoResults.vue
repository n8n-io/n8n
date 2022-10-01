<template>
	<div class="no-results">
		<div class="icon">
			<NoResultsIcon />
		</div>
		<div class="title">
			<div>
				{{ $locale.baseText('nodeCreator.noResults.weDidntMakeThatYet') }}
			</div>
			<div class="action">
				{{ $locale.baseText('nodeCreator.noResults.dontWorryYouCanProbablyDoItWithThe') }}
				<n8n-link @click="selectHttpRequest">{{ $locale.baseText('nodeCreator.noResults.httpRequest') }}</n8n-link> {{ $locale.baseText('nodeCreator.noResults.or') }}
				<n8n-link @click="selectWebhook">{{ $locale.baseText('nodeCreator.noResults.webhook') }}</n8n-link> {{ $locale.baseText('nodeCreator.noResults.node') }}
			</div>
		</div>

		<div class="request">
			<div>
				{{ $locale.baseText('nodeCreator.noResults.wantUsToMakeItFaster') }}
			</div>
			<div>
				<n8n-link
					:to="REQUEST_NODE_FORM_URL"
				>
					<span>{{ $locale.baseText('nodeCreator.noResults.requestTheNode') }}</span>&nbsp;
					<span>
						<font-awesome-icon
							class="external"
							icon="external-link-alt"
							:title="$locale.baseText('nodeCreator.noResults.requestTheNode')"
						/>
					</span>
				</n8n-link>
			</div>
		</div>
	</div>
</template>


<script lang="ts">
import { HTTP_REQUEST_NODE_TYPE, REQUEST_NODE_FORM_URL, WEBHOOK_NODE_TYPE } from '@/constants';
import Vue from 'vue';
import NoResultsIcon from './NoResultsIcon.vue';

export default Vue.extend({
	name: 'NoResults',
	components: {
		NoResultsIcon,
	},
	data() {
		return {
			REQUEST_NODE_FORM_URL,
		};
	},
	methods: {
		selectWebhook() {
			this.$emit('nodeTypeSelected', WEBHOOK_NODE_TYPE);
		},

		selectHttpRequest() {
			this.$emit('nodeTypeSelected', HTTP_REQUEST_NODE_TYPE);
		},
	},
});
</script>

<style lang="scss" scoped>
.no-results {
	background-color: $node-creator-no-results-background-color;
	text-align: center;
	height: 100%;
	border-left: 1px solid $node-creator-border-color;
	flex-direction: column;
	font-weight: 400;
	display: flex;
	align-items: center;
	align-content: center;
	padding: 0 50px;
}

.title {
	font-size: 22px;
	line-height: 22px;
	margin-top: 50px;

	div {
		margin-bottom: 15px;
	}
}

.action, .request {
	font-size: 14px;
	line-height: 19px;
}

.request {
	position: fixed;
	bottom: 20px;
	display: none;

	@media (min-height: 550px) {
		display: block;
	}
}

.icon {
	margin-top: 100px;
	min-height: 67px;
	opacity: .6;
}

.external {
	font-size: 12px;
}

</style>
