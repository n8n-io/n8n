<script setup lang="ts">
/** "Shared with {project}" next to the chat title, for the owner and the teammates. */
import { N8nBadge } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useThread } from '../instanceAi.store';
import { useThreadSharingView } from './useThreadSharing';
import { useSharingText } from './useSharingText';

const thread = useThread();
const i18n = useI18n();
const text = useSharingText();
const view = useThreadSharingView(thread);
</script>

<template>
	<N8nBadge
		v-if="view.isShared"
		variant="outline"
		leading-icon="users"
		data-test-id="instance-ai-shared-thread-chip"
	>
		{{
			i18n.baseText('instanceAi.sharing.sharedWith', {
				interpolate: { project: text.project(view.projectName) },
			})
		}}
	</N8nBadge>
</template>
