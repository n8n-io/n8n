<script setup lang="ts">
import { useMcpJsonNudgeEligibility } from '@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeEligibility';
import type { McpJsonNudgeAction } from '@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeTrigger';
import McpClientLogoCards from '@/features/ai/mcpAccess/components/McpClientLogoCards.vue';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useUIStore } from '@/app/stores/ui.store';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	MCP_JSON_NUDGE_MODAL_KEY,
	type McpJsonNudgeSurface,
} from '@/experiments/mcpJsonNudge/constants';

const props = defineProps<{
	data: {
		surface: McpJsonNudgeSurface;
		/** The gated export/import. Runs on Skip or dismiss; Connect abandons it. */
		onContinue?: McpJsonNudgeAction;
	};
}>();

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const eligibility = useMcpJsonNudgeEligibility();
const uiStore = useUIStore();
const modalBus = createEventBus();
const modalOpen = computed(() => uiStore.modalsById[MCP_JSON_NUDGE_MODAL_KEY]?.open === true);

const closedByAction = ref(false);
const dontShowAgain = ref(false);

const TITLE_KEY_BY_SURFACE = {
	export: 'experiments.mcpJsonNudge.modal.export.title',
	import_file: 'experiments.mcpJsonNudge.modal.import.title',
	import_url: 'experiments.mcpJsonNudge.modal.import.title',
	copy: 'experiments.mcpJsonNudge.modal.copy.title',
	paste: 'experiments.mcpJsonNudge.modal.paste.title',
} as const satisfies Record<McpJsonNudgeSurface, BaseTextKey>;

const title = computed(() => i18n.baseText(TITLE_KEY_BY_SURFACE[props.data.surface]));

function onDontShowAgainChange(value: boolean) {
	dontShowAgain.value = value;
	if (value) {
		telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_OPTED_OUT, { surface: props.data.surface });
		void eligibility.dismissForever();
	}
}

async function closeDialog() {
	uiStore.closeModal(MCP_JSON_NUDGE_MODAL_KEY);
	modalBus.emit('closed');
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

function onConnect() {
	closedByAction.value = true;
	telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_CONNECT_CLICKED, { surface: props.data.surface });
	void router.push({ name: MCP_SETTINGS_VIEW });
	void closeDialog();
}

function onSkip() {
	closedByAction.value = true;
	telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_SKIPPED, { surface: props.data.surface });
	void props.data.onContinue?.();
	void closeDialog();
}

// × / esc / click-outside: the user did not pick an action, so the original
// export/import still completes.
function onModalClosed() {
	if (!closedByAction.value) {
		telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_DISMISSED, { surface: props.data.surface });
		void props.data.onContinue?.();
	}
}

onMounted(() => {
	modalBus.on('closed', onModalClosed);
});

onBeforeUnmount(() => {
	modalBus.off('closed', onModalClosed);
});
</script>

<template>
	<N8nDialog :open="modalOpen" size="medium" :header="title" @update:open="onDialogOpenUpdate">
		<N8nDialogBody>
			<McpClientLogoCards :class="$style.logoCards" />
			<N8nText color="text-base">
				{{ i18n.baseText('experiments.mcpJsonNudge.modal.body') }}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nCheckbox
					:model-value="dontShowAgain"
					data-test-id="mcp-json-nudge-dont-show-again"
					@update:model-value="onDontShowAgainChange"
				>
					<template #label> {{ i18n.baseText('generic.dontShowAgain') }}</template>
				</N8nCheckbox>
				<div :class="$style.actions">
					<N8nButton
						variant="subtle"
						size="small"
						:label="i18n.baseText('experiments.mcpJsonNudge.modal.skip')"
						data-test-id="mcp-json-nudge-skip-button"
						@click="onSkip"
					/>
					<N8nButton
						variant="solid"
						size="small"
						:label="i18n.baseText('experiments.mcpJsonNudge.modal.connect')"
						data-test-id="mcp-json-nudge-connect-button"
						@click="onConnect"
					/>
				</div>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.logoCards {
	/* The tiles rotate ±8deg; the dialog content clips rotated corners when
	   padding is tight, so they need breathing room. */
	padding: var(--spacing--xs) var(--spacing--md);
	margin-bottom: var(--spacing--xs);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
