<script setup lang="ts">
import { useViewStacks } from '../composables/useViewStacks';

const { activeViewStack } = useViewStacks();

const { communityNodeDetails } = activeViewStack;

export interface Props {}

withDefaults(defineProps<Props>(), {});
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.header">
			<div :class="$style.title">
				<n8n-node-icon
					v-if="communityNodeDetails?.nodeIcon"
					:class="$style.nodeIcon"
					:type="communityNodeDetails.nodeIcon.iconType || 'unknown'"
					:src="communityNodeDetails.nodeIcon.icon"
					:name="communityNodeDetails.nodeIcon.icon"
					:color="communityNodeDetails.nodeIcon.color"
					:circle="false"
					:show-tooltip="false"
				/>
				<span>{{ communityNodeDetails?.title }}</span>
			</div>
			<N8nButton
				:loading="false"
				:disabled="false"
				label="Install Node"
				size="small"
				@click="() => console.log('installing node')"
			/>
		</div>
		<p :class="$style.description">{{ communityNodeDetails?.description }}</p>
		<div :class="$style.separator"></div>
		<div :class="$style.info">
			<div>
				<FontAwesomeIcon :class="$style.tooltipIcon" icon="check-circle" />
				{{ communityNodeDetails?.verified ? 'Verified' : 'Unverified' }}
			</div>
			<div>
				<FontAwesomeIcon :class="$style.tooltipIcon" icon="download" />
				{{ communityNodeDetails?.installs }} installs
			</div>
			<div>
				<FontAwesomeIcon :class="$style.tooltipIcon" icon="user" /> Published by
				{{ communityNodeDetails?.publishedBy }}
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	width: 100%;
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;
}
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.title {
	display: flex;
	align-items: center;
	color: var(--color-text);
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-bold);
}
.nodeIcon {
	--node-icon-size: 36px;
	margin-right: var(--spacing-s);
}

.description {
	margin: var(--spacing-m) 0;
	font-size: var(--font-size-s);
	line-height: 1rem;
	color: var(--node-creator-description-colos);
}
.separator {
	height: 1px;
	background: #e0e0e0;
	margin: 5px 0;
}
.info {
	display: flex;
	align-items: center;
	font-size: var(--font-size-3xs);
	color: var(--color-text-light);
	gap: var(--spacing-s);
	margin-top: var(--spacing-2xs);
	margin-bottom: var(--spacing-2xs);
}
.info div {
	display: flex;
	align-items: center;
	gap: 5px;
}

.tooltipIcon {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
}
</style>
