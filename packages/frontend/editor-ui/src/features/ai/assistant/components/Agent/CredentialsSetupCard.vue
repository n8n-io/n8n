<script setup lang="ts">
import { computed } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { N8nTooltip, N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useI18n } from '@n8n/i18n';

const MAX_VISIBLE_ICONS = 4;

interface CredentialIssue {
	node: string;
	type: string;
	value: string | string[];
}

interface Props {
	issues: CredentialIssue[];
	getNodeType: (nodeName: string) => INodeTypeDescription | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();

const displayNodes = computed(() => {
	const seen = new Set<string>();
	const uniqueNodes = props.issues.filter((issue) => {
		if (seen.has(issue.node)) return false;
		seen.add(issue.node);
		return true;
	});
	return {
		visible: uniqueNodes.slice(0, MAX_VISIBLE_ICONS),
		overflowCount: Math.max(0, uniqueNodes.length - MAX_VISIBLE_ICONS),
	};
});

function handleClick() {
	emit('click');
}
</script>

<template>
	<div
		:class="$style.credentialsCard"
		role="button"
		tabindex="0"
		@click="handleClick"
		@keydown.enter="handleClick"
	>
		<div :class="$style.credentialsContent">
			<span :class="$style.credentialsHeader">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.addMissingCredentials') }}
			</span>
			<div :class="$style.credentialsIcons">
				<N8nTooltip
					v-for="item in displayNodes.visible"
					:key="item.node"
					:content="item.node"
					placement="top"
				>
					<NodeIcon :node-type="getNodeType(item.node)" :size="20" />
				</N8nTooltip>
				<span v-if="displayNodes.overflowCount > 0" :class="$style.overflowBadge">
					+{{ displayNodes.overflowCount }}
				</span>
			</div>
		</div>
		<N8nIcon :class="$style.chevron" icon="chevron-right" />
	</div>
</template>

<style lang="scss" module>
.credentialsCard {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs);
	cursor: pointer;
	border-radius: var(--radius);
	transition: background-color 0.15s ease;

	&:hover {
		background-color: var(--color--foreground--tint-1);

		.chevron {
			color: var(--color--primary);
		}
	}
}

.credentialsContent {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.credentialsHeader {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.credentialsIcons {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.overflowBadge {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	background-color: var(--color--foreground);
	border-radius: var(--radius--sm);
}

.chevron {
	color: var(--color--text--tint-2);
	transition: color 0.15s ease;
}
</style>
