<script setup lang="ts">
import { computed, watch, ref, useCssModule, onMounted } from 'vue';
import type { INodeCreateElement } from '@/Interface';
import { useKeyboardNavigation } from '../../composables/useKeyboardNavigation';
import { useViewStacks } from '../../composables/useViewStacks';
import ItemsRenderer from './ItemsRenderer.vue';
import CategoryItem from '../ItemTypes/CategoryItem.vue';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useSettingsStore } from '@/app/stores/settings.store';

import CommunityNodeInstallHint from '@/features/settings/communityNodes/components/nodeCreator/CommunityNodeInstallHint.vue';

export interface Props {
	elements: INodeCreateElement[];
	category: string;
	disabled?: boolean;
	activeIndex?: number;
	isTriggerCategory?: boolean;
	mouseOverTooltip?: string;
	expanded?: boolean;
	showSeparator?: boolean;
	hideHeader?: boolean;
	showCreditsBalance?: boolean;
}

import { useI18n } from '@n8n/i18n';

import { N8nIcon, N8nTag, N8nTooltip } from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
const props = withDefaults(defineProps<Props>(), {
	elements: () => [],
});

const { popViewStack, activeViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeCreatorStore = useNodeCreatorStore();
const i18n = useI18n();

const aiGatewayStore = useAiGatewayStore();
const settingsStore = useSettingsStore();
const creditsBalanceText = computed(() => {
	const balance = aiGatewayStore.balance;
	if (!props.showCreditsBalance || balance === undefined) return undefined;
	return balance <= 0
		? i18n.baseText('aiGateway.wallet.noCredits')
		: i18n.baseText('aiGateway.wallet.balanceRemaining', {
				interpolate: { balance: `$${Number(balance).toFixed(2)}` },
			});
});

onMounted(() => {
	if (props.showCreditsBalance && settingsStore.isAiGatewayEnabled) {
		void aiGatewayStore.fetchWallet();
	}
});

const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);
const actionCount = computed(() => props.elements.filter(({ type }) => type === 'action').length);
const expanded = ref(props.expanded ?? false);
const isPreview = computed(
	() => activeViewStack.communityNodeDetails && !activeViewStack.communityNodeDetails.installed,
);

function toggleExpanded() {
	setExpanded(!expanded.value);
}

function setExpanded(isExpanded: boolean) {
	const prev = expanded.value;
	expanded.value = isExpanded;

	if (expanded.value && !prev) {
		nodeCreatorStore.onCategoryExpanded({
			category_name: props.category,
			workflow_id: workflowDocumentStore.value.workflowId,
		});
	}
}

const $style = useCssModule();
const containerClasses = computed(() => ({
	[$style.categorizedItemsRenderer]: true,
	[$style.separator]: expanded.value && props.showSeparator,
	[$style.headerless]: props.hideHeader,
}));

function arrowRight() {
	if (expanded.value) return;

	setExpanded(true);
}

function arrowLeft() {
	if (!expanded.value) {
		popViewStack();
		return;
	}

	setExpanded(false);
}

watch(
	() => props.elements,
	() => {
		setExpanded(true);
	},
);

registerKeyHook(`CategoryRight_${props.category}`, {
	keyboardKeys: ['ArrowRight'],
	condition: (type, activeItemId) => type === 'category' && props.category === activeItemId,
	handler: arrowRight,
});
registerKeyHook(`CategoryToggle_${props.category}`, {
	keyboardKeys: ['Enter'],
	condition: (type, activeItemId) => type === 'category' && props.category === activeItemId,
	handler: toggleExpanded,
});

registerKeyHook(`CategoryLeft_${props.category}`, {
	keyboardKeys: ['ArrowLeft'],
	condition: (type, activeItemId) => type === 'category' && props.category === activeItemId,
	handler: arrowLeft,
});
</script>

<template>
	<div :class="containerClasses" :data-category-collapsed="!expanded">
		<CategoryItem
			v-if="!hideHeader"
			:class="$style.categoryItem"
			:name="category"
			:disabled="disabled"
			:active="activeItemId === category"
			:count="actionCount"
			:expanded="expanded"
			:is-trigger="isTriggerCategory"
			data-keyboard-nav-type="category"
			:data-keyboard-nav-id="category"
			@click="toggleExpanded"
		>
			<span v-if="mouseOverTooltip" :class="$style.mouseOverTooltip">
				<N8nTooltip placement="top" :content-class="$style.tooltipPopper">
					<N8nIcon icon="circle-help" size="small" />
					<template #content>
						<div v-n8n-html="mouseOverTooltip" />
					</template>
				</N8nTooltip>
			</span>
			<template v-if="creditsBalanceText" #trailing>
				<N8nTag
					:class="$style.creditsBalance"
					:clickable="false"
					:text="creditsBalanceText"
					data-test-id="node-creator-credits-balance"
				/>
			</template>
		</CategoryItem>

		<div v-if="expanded && actionCount > 0 && $slots.default" :class="$style.contentSlot">
			<slot />
		</div>

		<CommunityNodeInstallHint
			v-if="isPreview && expanded"
			:hint="i18n.baseText('communityNodeItem.actions.hint')"
		/>

		<!-- Pass through listeners & empty slot to ItemsRenderer -->
		<ItemsRenderer
			v-if="expanded"
			v-bind="$attrs"
			:elements="elements"
			:is-trigger="isTriggerCategory"
			:class="[{ [$style.preview]: isPreview }]"
		>
			<template #default> </template>
			<template #empty>
				<slot name="empty" v-bind="{ elements }" />
			</template>
		</ItemsRenderer>
	</div>
</template>

<style lang="scss" module>
.mouseOverTooltip {
	opacity: 0;
	margin-left: var(--spacing--3xs);
	color: var(--color--foreground--shade-2);
	&:hover {
		color: var(--color--primary);
	}

	.categorizedItemsRenderer:hover & {
		opacity: 1;
	}
}
.tooltipPopper {
	max-width: 260px;
}
// Element selector bumps specificity above N8nTag's own size class
span.creditsBalance {
	margin-right: var(--spacing--3xs);
	height: auto;
	padding: var(--spacing--5xs) var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
}
.contentSlot {
	padding: 0 var(--spacing--sm) var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}
.categorizedItemsRenderer {
	padding-bottom: var(--spacing--sm);
}
.headerless {
	padding-bottom: 0;
}
.separator {
	border-bottom: 1px solid var(--color--foreground);
}
.preview {
	opacity: 0.7;
	pointer-events: none;
	cursor: default;
}
</style>
