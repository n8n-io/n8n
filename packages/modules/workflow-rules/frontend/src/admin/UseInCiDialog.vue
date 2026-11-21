<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogClose,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import { exportRules } from '../workflow-rules.api';

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const downloading = ref(false);
// How long the inline check stays after a copy. Not a debounce, so no shared duration fits.
const COPIED_FEEDBACK_MS = 2000;
/** Which snippet was copied last, for an inline check instead of a toast. */
const copied = ref<'actions' | 'offline' | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const onlineCommand = 'npx --yes @n8n/cli workflow-rules check . --output github';
const offlineCommand =
	'npx --yes @n8n/cli workflow-rules check . --rules workflow-rules.json --output github';
const actionsSnippet = `name: Workflow Rules
on: pull_request

jobs:
  workflow-rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Check workflows
        env:
          N8N_URL: \${{ secrets.N8N_URL }}
          N8N_API_KEY: \${{ secrets.N8N_API_KEY }}
        run: ${onlineCommand}`;

async function copy(text: string, which: 'actions' | 'offline') {
	try {
		await navigator.clipboard.writeText(text);
		copied.value = which;
		clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => (copied.value = null), COPIED_FEEDBACK_MS);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowRules.ci.copyError'));
	}
}

async function download() {
	downloading.value = true;
	try {
		const bundle = await exportRules(rootStore.restApiContext);
		const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'workflow-rules.json';
		link.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowRules.ci.downloadError'));
	} finally {
		downloading.value = false;
	}
}
</script>

<template>
	<N8nDialog v-model:open="open" :header="i18n.baseText('workflowRules.ci.title')" size="large">
		<N8nDialogBody>
			<div :class="$style.body" data-test-id="workflow-rules-ci">
				<N8nText size="small" tag="p">{{ i18n.baseText('workflowRules.ci.intro') }}</N8nText>

				<section :class="$style.step">
					<N8nText bold size="small">{{ i18n.baseText('workflowRules.ci.online.title') }}</N8nText>
					<N8nText size="small" color="text-light" tag="p">
						{{ i18n.baseText('workflowRules.ci.online.description') }}
					</N8nText>
					<div :class="$style.code">
						<pre>{{ actionsSnippet }}</pre>
						<N8nButton
							variant="ghost"
							size="small"
							:icon="copied === 'actions' ? 'check' : 'copy'"
							:label="
								copied === 'actions'
									? i18n.baseText('workflowRules.ci.copied')
									: i18n.baseText('workflowRules.ci.copy')
							"
							data-test-id="workflow-rules-ci-copy-actions"
							@click="copy(actionsSnippet, 'actions')"
						/>
					</div>
				</section>

				<section :class="$style.step">
					<N8nText bold size="small">{{ i18n.baseText('workflowRules.ci.offline.title') }}</N8nText>
					<N8nText size="small" color="text-light" tag="p">
						{{ i18n.baseText('workflowRules.ci.offline.description') }}
					</N8nText>
					<div :class="$style.code">
						<pre>{{ offlineCommand }}</pre>
						<N8nButton
							variant="ghost"
							size="small"
							:icon="copied === 'offline' ? 'check' : 'copy'"
							:label="
								copied === 'offline'
									? i18n.baseText('workflowRules.ci.copied')
									: i18n.baseText('workflowRules.ci.copy')
							"
							@click="copy(offlineCommand, 'offline')"
						/>
					</div>
				</section>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nDialogClose as-child>
				<N8nButton variant="outline" :label="i18n.baseText('workflowRules.common.close')" />
			</N8nDialogClose>
			<N8nButton
				variant="solid"
				icon="download"
				:loading="downloading"
				:label="i18n.baseText('workflowRules.ci.download')"
				data-test-id="workflow-rules-ci-download"
				@click="download"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.code {
	position: relative;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-2);

	pre {
		margin: 0;
		overflow-x: auto;
		font-family: var(--font-family--monospace);
		font-size: var(--font-size--2xs);
		white-space: pre;
	}
}
</style>
