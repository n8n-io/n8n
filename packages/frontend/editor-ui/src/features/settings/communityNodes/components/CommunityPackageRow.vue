<script lang="ts" setup>
import { computed } from 'vue';
import type { CommunityPackageRowData } from '../communityNodes.types';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nButton, N8nCard, N8nExternalLink, N8nText } from '@n8n/design-system';

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
