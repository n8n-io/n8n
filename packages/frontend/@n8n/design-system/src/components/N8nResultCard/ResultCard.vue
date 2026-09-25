<script lang="ts" setup>
import { computed, ref, useId } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nIcon from '../N8nIcon';
import N8nNodeIcon from '../N8nNodeIcon';
import ResultCardEmail from './bodies/ResultCardEmail.vue';
import ResultCardKeyValue from './bodies/ResultCardKeyValue.vue';
import ResultCardList from './bodies/ResultCardList.vue';
import ResultCardMessage from './bodies/ResultCardMessage.vue';
import ResultCardMetric from './bodies/ResultCardMetric.vue';
import ResultCardRecords from './bodies/ResultCardRecords.vue';
import type { ResultCardProps } from './ResultCard.types';
import { resolveResultCardSkin } from './skins';
import { isSafeHref } from './utils';

defineOptions({ name: 'N8nResultCard' });

const props = withDefaults(defineProps<ResultCardProps>(), {
	skin: undefined,
	icon: undefined,
	footer: undefined,
	expandable: true,
	executionLink: false,
});

const emit = defineEmits<{ openExecution: [] }>();

const { t } = useI18n();

const skin = computed(() => props.skin ?? resolveResultCardSkin(props.card.nodeType));
const expanded = ref(false);
const detailsId = `result-card-details-${useId()}`;

const statusLabel = computed(() => {
	if (!props.card.status) return null;
	return props.card.statusLabel || t(`resultCard.status.${props.card.status}`);
});

const safeActions = computed(() =>
	(props.card.actions ?? []).filter((action) => isSafeHref(action.href)),
);

const itemsLabel = computed(() => {
	const count = props.card.itemCount;
	if (count === undefined) return null;
	return count === 1 ? t('resultCard.item') : t('resultCard.items', { count: String(count) });
});

const footerParts = computed(() =>
	[
		props.footer?.workflowName ? t('resultCard.via', { name: props.footer.workflowName }) : null,
		itemsLabel.value,
		props.footer?.time ?? null,
	].filter((part): part is string => part !== null),
);

const detailsJson = computed(() => JSON.stringify(props.card, null, 2));
</script>

<template>
	<article
		:class="$style.card"
		:style="{ '--result-card--accent': skin.accent }"
		:data-skin="skin.id"
		:data-archetype="card.type"
		data-test-id="result-card"
	>
		<header :class="$style.header">
			<span :class="$style.iconTile" aria-hidden="true">
				<N8nNodeIcon
					v-if="icon && icon.type !== 'unknown'"
					:type="icon.type"
					:src="icon.src"
					:name="icon.name"
					:color="icon.color"
					:size="16"
				/>
				<N8nIcon v-else icon="circle-check" size="small" />
			</span>
			<div :class="$style.heading">
				<p v-if="card.eyebrow" :class="$style.eyebrow">{{ card.eyebrow }}</p>
				<h3 :class="$style.title">{{ card.title }}</h3>
			</div>
			<span v-if="statusLabel" :class="[$style.status, $style[`status-${card.status}`]]">
				{{ statusLabel }}
			</span>
		</header>

		<div :class="$style.body">
			<ResultCardEmail v-if="card.type === 'email'" :card="card" :skin="skin" />
			<ResultCardMessage v-else-if="card.type === 'message'" :card="card" :skin="skin" />
			<ResultCardRecords v-else-if="card.type === 'records'" :card="card" :skin="skin" />
			<ResultCardMetric v-else-if="card.type === 'metric'" :card="card" :skin="skin" />
			<ResultCardList v-else-if="card.type === 'list'" :card="card" :skin="skin" />
			<ResultCardKeyValue v-else :card="card" :skin="skin" />
		</div>

		<ul v-if="safeActions.length" :class="$style.actions">
			<li v-for="(action, index) in safeActions" :key="index">
				<a :href="action.href" target="_blank" rel="noopener noreferrer" :class="$style.actionLink">
					{{ action.label }} <N8nIcon icon="external-link" size="xsmall" />
				</a>
			</li>
		</ul>

		<footer v-if="footerParts.length > 0 || expandable" :class="$style.footer">
			<span :class="$style.provenance">
				<template v-for="(part, index) in footerParts" :key="index">
					<span v-if="index > 0" aria-hidden="true"> · </span><span>{{ part }}</span>
				</template>
			</span>
			<button
				v-if="expandable"
				type="button"
				:class="$style.toggle"
				:aria-expanded="expanded"
				:aria-controls="detailsId"
				data-test-id="result-card-toggle"
				@click="expanded = !expanded"
			>
				{{ expanded ? t('resultCard.hideDetails') : t('resultCard.details') }}
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="xsmall" />
			</button>
		</footer>

		<div
			v-if="expandable && expanded"
			:id="detailsId"
			:class="$style.details"
			data-test-id="result-card-details"
		>
			<pre :class="$style.json">{{ detailsJson }}</pre>
			<button
				v-if="executionLink"
				type="button"
				:class="$style.executionLink"
				@click="emit('openExecution')"
			>
				{{ t('resultCard.openExecution') }} <N8nIcon icon="external-link" size="xsmall" />
			</button>
		</div>
	</article>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.card {
	--result-card--accent-soft: color-mix(in srgb, var(--result-card--accent) 14%, transparent);

	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	max-width: 520px;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow:
		inset 3px 0 0 0 var(--result-card--accent),
		var(--shadow--xs);
	overflow: hidden;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--lg);
	color: var(--text-color);
	@include motion.fade-in-up;
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--sm);
}

.iconTile {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: var(--radius--md);
	background: var(--result-card--accent-soft);
	color: var(--result-card--accent);
}

.heading {
	flex: 1;
	min-width: 0;
}

.eyebrow {
	margin: 0;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide, 0.04em);
	text-transform: uppercase;
	color: var(--text-color--subtler);
}

.title {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	overflow-wrap: anywhere;
}

.status {
	flex: none;
	align-self: center;
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius--full);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: 1.6;
	background: var(--background--subtle);
	color: var(--text-color--subtle);
}

.status-success {
	background: var(--background--success);
	color: var(--text-color--success);
}

.status-error {
	background: var(--background--danger);
	color: var(--text-color--danger);
}

.status-pending {
	background: var(--background--warning);
	color: var(--text-color--warning);
}

.status-info {
	background: var(--background--info);
	color: var(--text-color--info);
}

.body {
	padding: 0 var(--spacing--xs) var(--spacing--2xs) var(--spacing--sm);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0 var(--spacing--xs) var(--spacing--2xs) var(--spacing--sm);
	list-style: none;
}

.actionLink,
.executionLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--primary);
	text-decoration: none;
	background: none;
	border: 0;
	padding: 0;
	cursor: pointer;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs) var(--spacing--3xs) var(--spacing--sm);
	border-top: 1px solid var(--border-color--subtle);
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtler);
}

.provenance {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.toggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex: none;
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	color: var(--text-color--subtle);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs) var(--spacing--sm);
	background: var(--background--subtle);
	border-top: 1px solid var(--border-color--subtle);
}

.json {
	margin: 0;
	max-height: 240px;
	overflow: auto;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
