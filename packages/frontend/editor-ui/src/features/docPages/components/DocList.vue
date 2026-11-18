<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { DocPageSummary } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import DocKindBadge from './DocKindBadge.vue';
import DocPropertyLine from './DocPropertyLine.vue';
import { DOC_PAGE_VIEW } from '../constants';
import { useOpenDocPage } from '../composables/useOpenDocPage';

withDefaults(
	defineProps<{
		items: DocPageSummary[];
		/** Hide the kind column when the list is already grouped by kind. */
		showKind?: boolean;
	}>(),
	{ showKind: true },
);

const i18n = useI18n();
const router = useRouter();
const { openDocPage } = useOpenDocPage();

async function open(item: DocPageSummary) {
	if (item.id) {
		await router.push({
			name: DOC_PAGE_VIEW,
			params: { projectId: item.projectId, pageId: item.id },
		});
		return;
	}
	await openDocPage(item.resourceType, item.resourceId);
}
</script>

<template>
	<div :class="$style.frame">
		<ul :class="[$style.list, { [$style.withKind]: showKind }]" data-testid="doc-list">
			<li
				v-for="(item, index) in items"
				:key="`${item.resourceType}-${item.resourceId}`"
				:class="$style.cell"
				:style="{ '--row-index': index }"
			>
				<button
					type="button"
					:class="$style.row"
					:title="item.excerpt || undefined"
					data-testid="doc-list-item"
					@click="open(item)"
				>
					<span v-if="showKind" :class="$style.kind">
						<DocKindBadge :kind="item.kind" />
					</span>
					<span :class="$style.name">
						<N8nIcon
							:icon="item.resourceType === 'agent' ? 'bot' : 'workflow'"
							size="small"
							:class="$style.resourceIcon"
						/>
						<span :class="$style.truncate">{{ item.name }}</span>
					</span>
					<span :class="$style.details">
						<DocPropertyLine :properties="item.properties" />
					</span>
					<span :class="$style.flags">
						<span v-if="item.isStale" :class="[$style.flag, $style.stale]">
							<N8nIcon icon="history" size="xsmall" />
							{{ i18n.baseText('docPages.stale.badge') }}
						</span>
						<span v-if="!item.isPublished" :class="$style.flag">
							{{ i18n.baseText('docPages.unpublished') }}
						</span>
					</span>
					<N8nIcon icon="arrow-right" size="small" :class="$style.arrow" />
				</button>
			</li>
			<li v-if="$slots.footer" :class="$style.footer" :style="{ '--row-index': items.length }">
				<slot name="footer" />
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
// The rows share the columns of the list through subgrid, so every column lines up.
.frame {
	container-type: inline-size;
}

.list {
	display: grid;
	grid-template-columns: minmax(10rem, 1fr) minmax(0, 1.6fr) auto auto;
	margin: 0;
	padding: 0;
	list-style: none;
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);

	&.withKind {
		grid-template-columns: max-content minmax(10rem, 1fr) minmax(0, 1.6fr) auto auto;
	}
}

.cell,
.footer {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: subgrid;
	border-bottom: var(--border-width) var(--border-style) var(--border-color--subtle);
	animation: rise var(--duration--slow) var(--easing--ease-out-quart) both;
	animation-delay: calc(var(--section-index, 0) * 60ms + var(--row-index, 0) * 25ms);
}

.row {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: subgrid;
	align-items: center;
	column-gap: var(--spacing--md);
	min-height: var(--height--3xl);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	background: none;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	text-align: left;
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&:focus-visible {
		background: var(--background--hover);

		.arrow {
			opacity: 1;
			transform: translateX(0);
		}
	}

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: calc(-1 * var(--spacing--5xs));
	}
}

.kind {
	display: flex;
}

.name {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	font-weight: var(--font-weight--medium);
}

.resourceIcon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.details {
	min-width: 0;
	// The property line is small on its own. In a row it reads at body size.
	--doc-property-line--font-size: var(--font-size--xs);
}

.flags {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.flag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	height: var(--height--xs);
	padding-inline: var(--spacing--2xs);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;

	&.stale {
		border: none;
		background: color-mix(in srgb, var(--color--yellow-500) 18%, transparent);
		color: color-mix(in srgb, var(--color--yellow-700) 75%, var(--text-color));
	}
}

.arrow {
	color: var(--text-color--subtle);
	opacity: 0;
	transform: translateX(-4px);
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--base) var(--easing--ease-out);
}

.footer > * {
	grid-column: 1 / -1;
}

.truncate {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

// On a narrow screen the details go to a second line under the name.
@container (max-width: 42rem) {
	.list,
	.list.withKind {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.row {
		row-gap: var(--spacing--4xs);
	}

	.kind,
	.arrow {
		display: none;
	}

	.details {
		grid-column: 1 / -1;
		grid-row: 2;
	}
}

@keyframes rise {
	from {
		opacity: 0;
		transform: translateY(4px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.cell,
	.footer {
		animation: none;
	}

	.row,
	.arrow {
		transition: none;
	}
}
</style>
