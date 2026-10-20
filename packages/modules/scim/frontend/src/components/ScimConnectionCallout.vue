<script setup lang="ts">
import type { ScimAuthFailure } from '@n8n/api-types';
import { N8nCallout, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { SCIM_DOCS_URL, SCIM_TEST_CONNECTION_DOCS_URL } from '../scim.constants';
import { formatDate } from '../scim.utils';

/**
 * The one callout above the Connection section. It tells the admin what the
 * identity provider sees right now, and offers the next step.
 */
const props = defineProps<{
	state: 'no_token' | 'waiting' | 'connected' | 'error';
	lastAuthFailure: ScimAuthFailure | null;
	/** ISO timestamp of the current token. The error copy names its rotation date. */
	tokenCreatedAt: string | null;
}>();

const emit = defineEmits<{
	generate: [];
	rotate: [];
	dismiss: [];
	help: [link: 'docs' | 'test_help'];
}>();

const i18n = useI18n();

const theme = computed(() => {
	switch (props.state) {
		case 'connected':
			return 'success';
		case 'error':
			return 'danger';
		default:
			return 'warning';
	}
});

const text = computed(() => {
	switch (props.state) {
		case 'no_token':
			return i18n.baseText('settings.scim.callout.noToken');
		case 'waiting':
			return i18n.baseText('settings.scim.callout.waiting');
		case 'connected':
			return i18n.baseText('settings.scim.callout.connected');
		case 'error': {
			const reason = props.lastAuthFailure?.reason ?? 'invalid_token';
			return i18n.baseText(`settings.scim.callout.error.${reason}`, {
				interpolate: { date: props.tokenCreatedAt ? formatDate(props.tokenCreatedAt) : '' },
			});
		}
	}
});
</script>

<template>
	<N8nCallout
		:theme="theme"
		themed-links
		:data-test-id="`scim-callout-${props.state}`"
		:class="$style.callout"
	>
		{{ text }}
		<template #actions>
			<span :class="$style.actions">
				<N8nLink
					v-if="props.state === 'no_token'"
					size="small"
					data-test-id="scim-callout-generate"
					@click="emit('generate')"
				>
					{{ i18n.baseText('settings.scim.token.generate') }}
				</N8nLink>
				<N8nLink
					v-else-if="props.state === 'waiting'"
					size="small"
					:to="SCIM_TEST_CONNECTION_DOCS_URL"
					new-window
					data-test-id="scim-callout-test-help"
					@click="emit('help', 'test_help')"
				>
					{{ i18n.baseText('settings.scim.callout.waiting.action') }}
				</N8nLink>
				<N8nLink
					v-else-if="props.state === 'connected'"
					size="small"
					data-test-id="scim-callout-dismiss"
					@click="emit('dismiss')"
				>
					{{ i18n.baseText('generic.dismiss') }}
				</N8nLink>
				<template v-else>
					<N8nLink size="small" data-test-id="scim-callout-rotate" @click="emit('rotate')">
						{{ i18n.baseText('settings.scim.callout.error.rotate') }}
					</N8nLink>
					<N8nLink
						size="small"
						:to="SCIM_DOCS_URL"
						new-window
						data-test-id="scim-callout-docs"
						@click="emit('help', 'docs')"
					>
						{{ i18n.baseText('settings.scim.callout.error.docs') }}
					</N8nLink>
				</template>
			</span>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.callout {
	align-items: center;
}

.actions {
	display: inline-flex;
	gap: var(--spacing--xs);
	white-space: nowrap;
}
</style>
