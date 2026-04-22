<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

interface CredentialIssue {
	node: string;
	type: string;
	value: string | string[];
}

interface Props {
	issues: CredentialIssue[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();

const MAX_VISIBLE_NODES = 3;

const nodeNames = computed(() => {
	const seen = new Set<string>();
	return props.issues
		.filter((issue) => {
			if (seen.has(issue.node)) return false;
			seen.add(issue.node);
			return true;
		})
		.map((issue) => issue.node);
});

const formattedNodeNames = computed(() => {
	const names = nodeNames.value;
	if (names.length === 0) return '';
	if (names.length === 1) return names[0];
	if (names.length === 2) {
		return i18n.baseText('aiAssistant.builder.executeMessage.nodeListTwo', {
			interpolate: { first: names[0], second: names[1] },
		});
	}

	if (names.length <= MAX_VISIBLE_NODES) {
		const allButLast = names.slice(0, -1).join(', ');
		return i18n.baseText('aiAssistant.builder.executeMessage.nodeListLast', {
			interpolate: { list: allButLast, last: names[names.length - 1] },
		});
	}

	const visible = names.slice(0, MAX_VISIBLE_NODES).join(', ');
	const remaining = names.length - MAX_VISIBLE_NODES;
	return i18n.baseText('aiAssistant.builder.executeMessage.nodeListMore', {
		interpolate: { list: visible, count: String(remaining) },
		adjustToNumber: remaining,
	});
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
		<N8nIcon :class="$style.keyIcon" icon="key-round" :size="14" />
		<div :class="$style.credentialsContent">
			<span :class="$style.credentialsHeader">
				{{ i18n.baseText('aiAssistant.builder.executeMessage.addMissingCredentials') }}
			</span>
			<span :class="$style.credentialsDescription">{{ formattedNodeNames }}</span>
		</div>
		<N8nIcon :class="$style.chevron" icon="chevron-right" />
	</div>
</template>

<style lang="scss" module>
.credentialsCard {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) 0;
	cursor: pointer;

	&:hover {
		color: var(--color--primary);
	}
}

.keyIcon {
	margin-right: var(--spacing--2xs);
	flex-shrink: 0;
	color: var(--color--primary);
}

.credentialsContent {
	flex: 1;
	padding-right: var(--spacing--xs);
	line-height: var(--line-height--md);
}

.credentialsHeader {
	font-weight: var(--font-weight--bold);
}

.credentialsDescription {
	margin-left: var(--spacing--4xs);
}

.chevron {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
	color: var(--color--text);
}
</style>
