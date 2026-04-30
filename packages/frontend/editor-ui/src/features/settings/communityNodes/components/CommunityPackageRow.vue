<script lang="ts" setup>
import { computed } from 'vue';
import type { CommunityPackageRowData } from '../communityNodes.types';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nButton, N8nCard, N8nExternalLink, N8nIcon, N8nText } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		row?: CommunityPackageRowData | null;
		loading?: boolean;
	}>(),
	{ row: null, loading: false },
);

const emit = defineEmits<{ installed: [] }>();

const i18n = useI18n();

const docsUrl = computed(() => `${NPM_PACKAGE_DOCS_BASE_URL}${props.row?.packageName ?? ''}`);

const formattedDownloads = computed(() => {
	const count = props.row?.numberOfDownloads ?? 0;
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
	return count.toString();
});
const bylinePrefix = computed(() =>
	props.row?.authorName
		? i18n.baseText('settings.communityNodes.byline', {
				interpolate: { author: props.row.authorName },
			})
		: '',
);

function onInstall() {
	emit('installed');
}
</script>

<template>
	<N8nCard data-test-id="community-package-row">
		<template #prepend>
			<NodeIcon
				v-if="row?.nodeDescription"
				:node-type="row.nodeDescription"
				:show-tooltip="false"
			/>
		</template>
		<template #header>
			<div :class="$style.identity">
				<N8nExternalLink :href="docsUrl">
					<N8nText :bold="true" size="small">{{ row?.packageName }}</N8nText>
				</N8nExternalLink>
			</div>
			<div :class="$style.stats">
				<span v-if="row?.nodeCount" :class="$style.stat">
					<N8nIcon icon="box" size="xsmall" />
					<N8nText size="xsmall" color="text-light" :bold="true">{{ row.nodeCount }}</N8nText>
				</span>
				<span v-if="row?.numberOfDownloads" :class="$style.stat">
					<N8nIcon icon="hard-drive-download" size="xsmall" />
					<N8nText size="xsmall" color="text-light" :bold="true">{{ formattedDownloads }}</N8nText>
				</span>
			</div>
		</template>
		<N8nText size="xsmall" color="text-light" :class="$style.byline">
			{{ bylinePrefix }}<template v-if="row?.description"> · {{ row.description }}</template>
		</N8nText>
		<template #append>
			<div :class="$style.actions">
				<N8nButton
					v-if="!row?.isInstalled"
					data-test-id="community-package-row__install"
					size="small"
					:label="i18n.baseText('settings.communityNodes.row.install')"
					:class="$style.hoverCta"
					@click="onInstall"
				/>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.byline {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

.stats {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
}

.stat {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.hoverCta {
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.15s ease;
}

[data-test-id='community-package-row']:hover .hoverCta,
[data-test-id='community-package-row']:focus-within .hoverCta {
	opacity: 1;
	pointer-events: auto;
}

@media (hover: none) {
	.hoverCta {
		opacity: 1;
		pointer-events: auto;
	}
}
</style>
