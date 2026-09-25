<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import type { EmailCardData, ResultCardSkin } from '../ResultCard.types';

const props = defineProps<{ card: EmailCardData; skin: ResultCardSkin }>();
const { t } = useI18n();

const counterpart = computed(() =>
	props.card.direction === 'sent' ? props.card.to.join(', ') : (props.card.from ?? ''),
);
const initial = computed(() => counterpart.value.trim().charAt(0).toUpperCase() || '@');
</script>

<template>
	<div :class="[$style.email, $style[`grammar-${skin.grammar}`]]">
		<div :class="$style.row">
			<span :class="$style.avatar" aria-hidden="true">{{ initial }}</span>
			<div :class="$style.headers">
				<p :class="$style.line">
					<span :class="$style.label">{{
						card.direction === 'sent' ? t('resultCard.email.to') : t('resultCard.email.from')
					}}</span>
					<span :class="$style.value">{{ counterpart }}</span>
				</p>
				<p v-if="card.cc?.length" :class="$style.line">
					<span :class="$style.label">{{ t('resultCard.email.cc') }}</span>
					<span :class="$style.value">{{ card.cc.join(', ') }}</span>
				</p>
				<p :class="$style.subject">{{ card.subject }}</p>
				<p v-if="card.preview" :class="$style.preview">{{ card.preview }}</p>
			</div>
		</div>
		<ul v-if="card.attachments?.length || card.labels?.length" :class="$style.chips">
			<li v-for="(name, index) in card.attachments ?? []" :key="`a-${index}`" :class="$style.chip">
				{{ name }}
			</li>
			<li
				v-for="(label, index) in card.labels ?? []"
				:key="`l-${index}`"
				:class="[$style.chip, $style.labelChip]"
			>
				{{ label }}
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.email {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-start;
}

.avatar {
	display: none;
	flex: none;
	width: 32px;
	height: 32px;
	border-radius: var(--radius--full);
	align-items: center;
	justify-content: center;
	font-weight: var(--font-weight--bold);
	background: var(--result-card--accent-soft);
	color: var(--result-card--accent);
}

.grammar-inboxRow .avatar {
	display: inline-flex;
}

.headers {
	flex: 1;
	min-width: 0;
}

.line,
.subject,
.preview {
	margin: 0;
	overflow-wrap: anywhere;
}

.label {
	display: inline-block;
	min-width: 2.2em;
	color: var(--text-color--subtler);
}

.value {
	color: var(--text-color--subtle);
}

.subject {
	margin-top: var(--spacing--5xs);
	font-weight: var(--font-weight--medium);
}

.preview {
	color: var(--text-color--subtle);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.chip {
	padding: 0 var(--spacing--2xs);
	border: 1px solid var(--border-color);
	border-radius: var(--radius--full);
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtle);
	background: var(--background--subtle);
}

.labelChip {
	border-color: transparent;
	background: var(--result-card--accent-soft);
	color: var(--text-color--subtle);
}
</style>
