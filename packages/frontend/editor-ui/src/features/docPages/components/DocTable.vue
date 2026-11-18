<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { DocPageKind, DocPageSummary, DocPageTrigger } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import DocCopyButton from './DocCopyButton.vue';
import DocMethodChips from './DocMethodChips.vue';
import { DOC_PAGE_VIEW } from '../constants';
import { useOpenDocPage } from '../composables/useOpenDocPage';
import { formatScheduleRule } from '../docPages.properties';

/** All items have this kind. The kind picks the property columns. */
const props = defineProps<{ kind: DocPageKind; items: DocPageSummary[] }>();

const i18n = useI18n();
const router = useRouter();
const nodeTypesStore = useNodeTypesStore();
const { openDocPage } = useOpenDocPage();

function triggers<T extends DocPageTrigger['type']>(item: DocPageSummary, ...types: T[]) {
	const wanted = new Set<string>(types);
	return (item.properties?.triggers ?? []).filter((t): t is Extract<DocPageTrigger, { type: T }> =>
		wanted.has(t.type),
	);
}

const nodeTypeOf = (trigger: DocPageTrigger) =>
	nodeTypesStore.getNodeType(trigger.nodeType, trigger.typeVersion);

const columns: Record<DocPageKind, BaseTextKey[]> = {
	api: ['docPages.properties.endpoint', 'docPages.properties.authentication'],
	schedule: ['docPages.properties.schedule'],
	event: ['docPages.properties.trigger'],
	agent: ['docPages.properties.model', 'docPages.properties.channels'],
};

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
		<table :class="[$style.table, $style[props.kind]]" :data-testid="`doc-table-${kind}`">
			<thead>
				<tr>
					<th scope="col">{{ i18n.baseText('docPages.table.name') }}</th>
					<th v-for="column in columns[kind]" :key="column" scope="col">
						{{ i18n.baseText(column) }}
					</th>
					<th scope="col" :class="$style.statusHead">
						<span :class="$style.visuallyHidden">{{ i18n.baseText('docPages.table.status') }}</span>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="item in items"
					:key="`${item.resourceType}-${item.resourceId}`"
					:class="$style.row"
					data-testid="doc-table-row"
					@click="open(item)"
				>
					<td :class="$style.nameCell">
						<button
							type="button"
							:class="$style.name"
							:title="item.excerpt || undefined"
							@click.stop="open(item)"
						>
							<N8nIcon
								:icon="item.resourceType === 'agent' ? 'bot' : 'workflow'"
								size="small"
								:class="$style.muted"
							/>
							<span>{{ item.name }}</span>
						</button>
					</td>

					<!-- API: one line for each webhook or form, in the same order in both columns. -->
					<template v-if="kind === 'api'">
						<td>
							<div :class="$style.lines">
								<div
									v-for="trigger in triggers(item, 'webhook', 'form')"
									:key="trigger.nodeName"
									:class="$style.endpoint"
									data-testid="doc-table-endpoint"
								>
									<DocMethodChips v-if="trigger.type === 'webhook'" :methods="trigger.methods" />
									<span v-else :class="$style.formChip">
										{{ i18n.baseText('docPages.properties.form') }}
									</span>
									<span :class="$style.url">{{ trigger.url }}</span>
									<DocCopyButton :value="trigger.url" :class="$style.copy" />
								</div>
								<span v-if="!triggers(item, 'webhook', 'form').length" :class="$style.muted"
									>—</span
								>
							</div>
						</td>
						<td>
							<div :class="$style.lines">
								<span
									v-for="trigger in triggers(item, 'webhook', 'form')"
									:key="trigger.nodeName"
									:class="[$style.auth, { [$style.open]: trigger.auth === 'none' }]"
								>
									<N8nIcon :icon="trigger.auth === 'none' ? 'globe' : 'lock'" size="xsmall" />
									{{ i18n.baseText(`docPages.properties.auth.${trigger.auth}`) }}
								</span>
							</div>
						</td>
					</template>

					<td v-else-if="kind === 'schedule'">
						<div :class="$style.lines">
							<template v-for="trigger in triggers(item, 'schedule')" :key="trigger.nodeName">
								<span v-for="(rule, index) in trigger.rules" :key="index" :class="$style.withIcon">
									<N8nIcon icon="clock" size="xsmall" :class="$style.muted" />
									{{ formatScheduleRule(rule) }}
								</span>
							</template>
							<span v-if="!triggers(item, 'schedule').length" :class="$style.muted">—</span>
						</div>
					</td>

					<td v-else-if="kind === 'event'">
						<div :class="$style.lines">
							<span
								v-for="trigger in triggers(item, 'event')"
								:key="trigger.nodeName"
								:class="$style.withIcon"
							>
								<NodeIcon
									:node-type="nodeTypeOf(trigger)"
									:node-name="trigger.nodeName"
									:size="16"
								/>
								{{ nodeTypeOf(trigger)?.displayName ?? trigger.nodeName }}
							</span>
							<span v-if="!triggers(item, 'event').length" :class="$style.muted">—</span>
						</div>
					</td>

					<template v-else-if="kind === 'agent'">
						<td>
							<span v-if="item.properties?.agent?.model" :class="$style.mono">
								{{ item.properties.agent.model }}
							</span>
							<span v-else :class="$style.muted">—</span>
						</td>
						<td>
							<div :class="$style.lines">
								<span v-if="item.properties?.agent?.channels.length" :class="$style.chips">
									<span
										v-for="channel in item.properties.agent.channels"
										:key="channel"
										:class="$style.chip"
									>
										{{ channel }}
									</span>
								</span>
								<div
									v-for="trigger in triggers(item, 'chat')"
									:key="trigger.nodeName"
									:class="$style.endpoint"
								>
									<span :class="$style.formChip">
										{{ i18n.baseText('docPages.properties.chat') }}
									</span>
									<template v-if="trigger.url">
										<span :class="$style.url">{{ trigger.url }}</span>
										<DocCopyButton :value="trigger.url" :class="$style.copy" />
									</template>
									<span v-else :class="$style.muted">
										{{ i18n.baseText('docPages.properties.private') }}
									</span>
								</div>
								<span
									v-if="!item.properties?.agent?.channels.length && !triggers(item, 'chat').length"
									:class="$style.muted"
								>
									—
								</span>
							</div>
						</td>
					</template>

					<td :class="$style.status">
						<span v-if="item.isStale" :class="[$style.flag, $style.stale]">
							<N8nIcon icon="history" size="xsmall" />
							{{ i18n.baseText('docPages.stale.badge') }}
						</span>
						<span v-if="!item.isPublished" :class="$style.flag">
							{{ i18n.baseText('docPages.unpublished') }}
						</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/utils';

.frame {
	overflow-x: auto;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--md);
	background: var(--background--surface);
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);

	th,
	td {
		padding: var(--spacing--2xs) var(--spacing--sm);
		text-align: left;
		vertical-align: top;
	}

	th {
		padding-block: var(--spacing--3xs);
		border-bottom: var(--border-width) var(--border-style) var(--border-color);
		background: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		white-space: nowrap;
	}

	td {
		border-bottom: var(--border-width) var(--border-style) var(--border-color--subtle);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}
}

// Column widths for each kind. The property column takes the rest.
.nameCell {
	width: 28%;
	min-width: 12rem;
}

.api td:nth-child(3) {
	width: 9rem;
	white-space: nowrap;
}

.agent td:nth-child(2) {
	width: 30%;
}

.statusHead,
.status {
	width: 1%;
	white-space: nowrap;
}

.row {
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background: var(--background--hover);
	}

	&:hover .copy,
	&:focus-within .copy {
		opacity: 1;
	}
}

.name {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: 0;
	border: none;
	background: none;
	color: var(--text-color);
	font: inherit;
	font-weight: var(--font-weight--medium);
	text-align: left;
	cursor: pointer;

	> :first-child {
		margin-top: var(--spacing--5xs);
		flex-shrink: 0;
	}

	&:hover span,
	&:focus-visible span {
		text-decoration: underline;
		text-underline-offset: var(--spacing--5xs);
	}

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
		border-radius: var(--radius--2xs);
	}
}

.lines {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

// Each line keeps the height of a copy button, so the auth column lines up with it.
.endpoint,
.auth,
.withIcon {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-height: var(--height--md);
}

.url {
	min-width: 0;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}

.copy {
	flex-shrink: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);

	// Touch screens have no hover, so the button stays visible there.
	@media (hover: hover) {
		opacity: 0;
	}
}

.formChip {
	flex-shrink: 0;
	padding-inline: var(--spacing--3xs);
	border-radius: var(--radius--2xs);
	background: var(--background--hover);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
	text-transform: uppercase;
}

.auth {
	gap: var(--spacing--4xs);
	color: var(--text-color);
	font-size: var(--font-size--xs);

	&.open {
		color: var(--text-color--subtle);
	}
}

.mono {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	padding-block: var(--spacing--4xs);
}

.chip {
	padding-inline: var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.status {
	text-align: right;

	> * + * {
		margin-left: var(--spacing--4xs);
	}
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

.muted {
	color: var(--text-color--subtler);
}

.visuallyHidden {
	@include utils.utils-sr-only;
}

@media (prefers-reduced-motion: reduce) {
	.row,
	.copy {
		transition: none;
	}
}
</style>
