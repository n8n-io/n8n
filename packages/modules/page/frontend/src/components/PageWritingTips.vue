<script setup lang="ts">
import { N8nIcon, N8nKeyboardShortcut } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

/** Teaches the three ways to write a page: blocks, mentions and pasted addresses. */
type WritingTip = { id: string; key?: string; text: BaseTextKey };

const TIPS: WritingTip[] = [
	{ id: 'blocks', key: '/', text: 'page.tips.blocks' },
	{ id: 'mention', key: '@', text: 'page.tips.mention' },
	{ id: 'paste', text: 'page.tips.paste' },
];

const i18n = useI18n();
</script>

<template>
	<ul :class="$style.tips" data-test-id="page-writing-tips">
		<li v-for="tip in TIPS" :key="tip.id" :class="$style.tip">
			<N8nKeyboardShortcut v-if="tip.key" :keys="[tip.key]" />
			<span v-else :class="$style.icon"><N8nIcon icon="link" size="small" /></span>
			<span>{{ i18n.baseText(tip.text) }}</span>
		</li>
	</ul>
</template>

<style lang="scss" module>
.tips {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--xs) var(--spacing--lg);
	margin: 0;
	padding: 0;
	list-style: none;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}

.tip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon {
	display: inline-flex;
	color: var(--text-color--subtler);
}
</style>
