<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import McpClientLogoCards from '@/features/ai/mcpAccess/components/McpClientLogoCards.vue';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { N8nButton, N8nCheckbox, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	MCP_JSON_NUDGE_MODAL_KEY,
	type McpJsonNudgeSurface,
} from '@/experiments/mcpJsonNudge/constants';

const props = defineProps<{
	data: {
		surface: McpJsonNudgeSurface;
	};
}>();

const i18n = useI18n();
const router = useRouter();

const title = computed(() =>
	props.data.surface === 'export'
		? i18n.baseText('experiments.mcpJsonNudge.modal.export.title')
		: i18n.baseText('experiments.mcpJsonNudge.modal.import.title'),
);

const dontShowAgain = ref(false);

function onConnect(close: () => void) {
	void router.push({ name: MCP_SETTINGS_VIEW });
	close();
}

function onSkip(close: () => void) {
	close();
}
</script>

<template>
	<Modal :name="MCP_JSON_NUDGE_MODAL_KEY" :title="title" width="480px">
		<template #content>
			<McpClientLogoCards :class="$style.logoCards" />
			<N8nText color="text-base">
				{{ i18n.baseText('experiments.mcpJsonNudge.modal.body') }}
			</N8nText>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nCheckbox v-model="dontShowAgain" data-test-id="mcp-json-nudge-dont-show-again">
					<template #label>{{ i18n.baseText('generic.dontShowAgain') }}</template>
				</N8nCheckbox>
				<div :class="$style.actions">
					<N8nButton
						variant="subtle"
						size="small"
						:label="i18n.baseText('experiments.mcpJsonNudge.modal.skip')"
						data-test-id="mcp-json-nudge-skip-button"
						@click="onSkip(close)"
					/>
					<N8nButton
						variant="solid"
						size="small"
						:label="i18n.baseText('experiments.mcpJsonNudge.modal.connect')"
						data-test-id="mcp-json-nudge-connect-button"
						@click="onConnect(close)"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.logoCards {
	/* The tiles rotate ±8deg; Modal's content area clips (overflow: hidden,
	   near-zero inline padding), so the rotated corners need breathing room. */
	padding: var(--spacing--xs) var(--spacing--md);
	margin-bottom: var(--spacing--xs);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
