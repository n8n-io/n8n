<script lang="ts">
export default {
	inheritAttrs: false,
};
</script>

<script setup lang="ts">
// import { reactive, computed, watch, onMounted, nextTick } from 'vue';
import SearchBar from './SearchBar.vue';

export interface Props {
	title: string;
	hasBackButton?: boolean;
	hasSearch?: boolean;
	subtitle?: string;
	search?: string;
	searchPlaceholder?: string;
	hasHeaderBg?: boolean;
	transitionDirection?: 'in' | 'out';
	nodeIcon?: {
		iconType?: string;
		icon?: string;
		color?: string;
	};
}

const emit = defineEmits<{
	(event: 'back'): void;
	(event: 'transitionEnd'): void;
	(event: 'searchInput', value: string): void;
}>();

withDefaults(defineProps<Props>(), {
	transitionDirection: 'in',
});

function onBackButton() {
	emit('back');
}

function onSearch(e: string) {
	// state.search = e;
	emit('searchInput', e);
}
</script>

<template>
	<transition :name="`panel-slide-${transitionDirection}`" @afterLeave="$listeners.transitionEnd">
		<aside :class="$style.nodesListPanel" @keydown.capture.stop>
			<header :class="{ [$style.header]: true, [$style.hasBg]: hasHeaderBg }" data-test-id="nodes-list-header">
				<div :class="$style.top">
					<button :class="$style.backButton" @click="onBackButton" v-if="hasBackButton">
						<font-awesome-icon :class="$style.backButtonIcon" icon="arrow-left" size="2x" />
					</button>
					<n8n-node-icon
						v-if="nodeIcon"
						:class="$style.nodeIcon"
						:type="nodeIcon.iconType || 'unknown'"
						:src="nodeIcon.icon"
						:name="nodeIcon.icon"
						:color="nodeIcon.color"
						:circle="false"
						:showTooltip="false"
						:size="16"
					/>
					<p :class="$style.title" v-text="title" v-if="title" />
				</div>
				<p
					v-if="subtitle && !hasHeaderBg"
					:class="{ [$style.subtitle]: true, [$style.offsetSubtitle]: hasBackButton }"
					v-text="subtitle"
				/>
			</header>
			<search-bar
				v-if="hasSearch"
				:class="$style.searchBar"
				:placeholder="
					searchPlaceholder
						? searchPlaceholder
						: $locale.baseText('nodeCreator.searchBar.searchNodes')
				"
				@input="onSearch"
				:value="search"
			/>
			<div :class="$style.renderedItems">
				<slot />
			</div>
		</aside>
	</transition>
</template>

<style lang="scss" module>
:global(.panel-slide-in-leave-active),
:global(.panel-slide-in-enter-active),
:global(.panel-slide-out-leave-active),
:global(.panel-slide-out-enter-active) {
	transition: transform 300ms ease;
	position: absolute;
	left: 0;
	right: 0;
}

:global(.panel-slide-out-enter),
:global(.panel-slide-in-leave-to) {
	transform: translateX(0);
	z-index: -1;
}

:global(.panel-slide-out-leave-to),
:global(.panel-slide-in-enter) {
	transform: translateX(100%);
	// Make sure the leaving panel stays on top
	// for the slide-out panel effect
	z-index: 1;
}
.backButton {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 0 var(--spacing-xs) 0 0;
}

.backButtonIcon {
	color: $node-creator-arrow-color;
	height: 16px;
	padding: 0;
}
.nodeIcon {
	--node-icon-size: 16px;
	margin-right: var(--spacing-s);
}
.renderedItems {
	overflow: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	scrollbar-width: none; /* Firefox 64 */
	padding-bottom: var(--spacing-xl);
	&::-webkit-scrollbar {
		display: none;
	}
}
.searchBar {
	flex-shrink: 0;
}
.nodesListPanel {
	background: white;
	height: 100%;
	background-color: $node-creator-background-color;
	width: 385px;
	display: flex;
	flex-direction: column;

	&:before {
		box-sizing: border-box;
		content: '';
		border-left: 1px solid $node-creator-border-color;
		width: 1px;
		position: absolute;
		height: 100%;
	}
}
.footer {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin: 0 var(--spacing-xs) 0;
	padding: var(--spacing-4xs) 0;
	line-height: var(--font-line-height-regular);
	border-top: 1px solid #dbdfe7;
	z-index: 1;
	margin-top: -1px;
}
.top {
	display: flex;
	align-items: center;
}
.header {
	font-size: var(--font-size-l);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-line-height-compact);

	padding: var(--spacing-s) var(--spacing-s);

	&.hasBg {
		border-bottom: $node-creator-border-color solid 1px;
		background-color: $node-creator-subcategory-panel-header-bacground-color;
	}
}
.title {
	line-height: 24px;
	font-weight: 600;
	font-size: 18px;

	.hasBg & {
		font-size: 16px;
		line-height: 22px;
	}
}
.subtitle {
	margin-top: var(--spacing-4xs);
	font-size: 14px;
	line-height: 19px;
	color: var(--color-text-base);
	font-weight: 400;
}
.offsetSubtitle {
	margin-left: calc(var(--spacing-xl) + var(--spacing-4xs));
}
</style>
