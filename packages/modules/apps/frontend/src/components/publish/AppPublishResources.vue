<script setup lang="ts">
import type { AppPublishPreviewResource } from '@n8n/api-types';
import {
	N8nDataTableServer,
	N8nIcon,
	N8nText,
	N8nTooltip,
	type TableHeader,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { BINDING_KINDS } from '../configure/connections/bindingKinds';

defineProps<{ resources: AppPublishPreviewResource[]; projectId: string; loading: boolean }>();

const i18n = useI18n();

const headers: Array<TableHeader<AppPublishPreviewResource>> = [
	{ title: i18n.baseText('apps.publish.dialog.resources.column.name'), key: 'name' },
];
</script>

<template>
	<N8nDataTableServer
		:headers="headers"
		:items="resources"
		item-value="key"
		:items-length="resources.length"
		:page-sizes="[resources.length + 1]"
		:pagination="false"
		:loading="loading"
		data-test-id="app-publish-resources-list"
	>
		<template #[`item.name`]="{ item }">
			<div :class="$style.name">
				<N8nIcon
					:icon="BINDING_KINDS[item.kind].icon"
					:size="14"
					:data-test-id="`app-publish-resource-${item.key}-icon`"
				/>
				<RouterLink
					:to="BINDING_KINDS[item.kind].route(projectId, item.resourceId)"
					target="_blank"
					:data-test-id="`app-publish-resource-${item.key}`"
				>
					<N8nText :class="$style.link">{{ item.name }}</N8nText>
				</RouterLink>
				<N8nTooltip v-if="!item.canPublish" placement="top">
					<N8nIcon
						icon="triangle-alert"
						:size="14"
						:class="$style.warning"
						:data-test-id="`app-publish-resource-${item.key}-warning`"
					/>
					<template #content>
						{{ i18n.baseText('apps.publish.dialog.resources.cannotPublish') }}
					</template>
				</N8nTooltip>
			</div>
		</template>
	</N8nDataTableServer>
</template>

<style lang="scss" module>
.name {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.link {
	color: var(--color--text);
}

.warning {
	color: var(--color--warning);
}
</style>
