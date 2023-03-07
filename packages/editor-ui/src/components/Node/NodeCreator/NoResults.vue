<template>
	<div :class="{ [$style.noResults]: true, [$style.iconless]: !showIcon }">
		<div :class="$style.icon" v-if="showIcon">
			<no-results-icon />
		</div>
		<div :class="$style.title">
			<slot name="title" />
			<div :class="$style.action">
				<slot name="action" />
			</div>
		</div>

		<div :class="$style.request" v-if="showRequest">
			<p v-text="$locale.baseText('nodeCreator.noResults.wantUsToMakeItFaster')" />
			<div>
				<n8n-link :to="REQUEST_NODE_FORM_URL">
					<span>{{ $locale.baseText('nodeCreator.noResults.requestTheNode') }}</span
					>&nbsp;
					<span>
						<font-awesome-icon
							:class="$style.external"
							icon="external-link-alt"
							:title="$locale.baseText('nodeCreator.noResults.requestTheNode')"
						/>
					</span>
				</n8n-link>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { REQUEST_NODE_FORM_URL } from '@/constants';
import NoResultsIcon from './NoResultsIcon.vue';

export interface Props {
	showIcon?: boolean;
	showRequest?: boolean;
}

defineProps<Props>();
</script>

<style lang="scss" module>
.noResults {
	background-color: $node-creator-no-results-background-color;
	text-align: center;
	height: 100%;
	border-left: 1px solid $node-creator-border-color;
	flex-direction: column;
	font-weight: 400;
	display: flex;
	align-items: center;
	align-content: center;
	padding: 0 var(--spacing-2xl);
}

.title {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-regular);
	margin-top: var(--spacing-xs);

	div {
		margin-bottom: var(--spacing-s);
	}
}

.action p,
.request p {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-xloose);
}

.request {
	position: fixed;
	bottom: var(--spacing-m);
	display: none;

	@media (min-height: 550px) {
		display: block;
	}
}

.icon {
	margin-top: var(--spacing-2xl);
	min-height: 67px;
	opacity: 0.6;
}

.external {
	font-size: var(--font-size-2xs);
}
</style>
