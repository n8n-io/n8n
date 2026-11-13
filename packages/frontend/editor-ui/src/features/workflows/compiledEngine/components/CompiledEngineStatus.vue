<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

import { useCompiledEngineWorkflow } from '../composables/useCompiledEngineWorkflow';
import type { CompileDiagnostic, CompileDiagnosticSeverity } from '../compiledEngine.types';

const i18n = useI18n();
const documentStore = injectWorkflowDocumentStore();
const { isCompiledWorkflow, status, result } = useCompiledEngineWorkflow({ sync: true });

const isOpen = ref(false);

const label = computed(() => {
	const current = status.value;
	switch (current.state) {
		case 'loading':
			return i18n.baseText('compiledEngine.status.loading');
		case 'failed':
			return i18n.baseText('compiledEngine.status.failed');
		case 'ok':
			return current.warnings > 0
				? i18n.baseText('compiledEngine.status.okWithWarnings', {
						interpolate: { count: current.warnings },
						adjustToNumber: current.warnings,
					})
				: i18n.baseText('compiledEngine.status.ok');
		case 'problems':
			return i18n.baseText('compiledEngine.status.problems', {
				interpolate: { count: current.errors },
				adjustToNumber: current.errors,
			});
		default:
			return '';
	}
});

const icon = computed((): IconName | undefined => {
	switch (status.value.state) {
		case 'ok':
			return 'circle-check';
		case 'problems':
			return 'circle-x';
		case 'failed':
			return 'triangle-alert';
		default:
			return undefined;
	}
});

const nodeSummary = computed(() => {
	const counts = { native: 0, code: 0, host: 0 };
	for (const mode of Object.values(result.value?.nodes ?? {})) counts[mode]++;
	return i18n.baseText('compiledEngine.panel.nodeSummary', {
		interpolate: {
			native: String(counts.native),
			code: String(counts.code),
			host: String(counts.host),
		},
	});
});

const headline = computed(() => {
	const current = status.value;
	if (current.state === 'failed') {
		return i18n.baseText('compiledEngine.panel.failed', {
			interpolate: { message: current.message },
		});
	}
	if (current.state === 'problems') return i18n.baseText('compiledEngine.panel.doesNotCompile');
	return i18n.baseText('compiledEngine.panel.compiles');
});

const diagnostics = computed(() => result.value?.diagnostics ?? []);

const severityIcon: Record<CompileDiagnosticSeverity, IconName> = {
	error: 'circle-x',
	warning: 'triangle-alert',
	info: 'info',
};

function severityLabel(severity: CompileDiagnosticSeverity) {
	return i18n.baseText(`compiledEngine.severity.${severity}`);
}

function nodeIdOf(diagnostic: CompileDiagnostic): string | undefined {
	if (!diagnostic.node) return undefined;
	return documentStore.value.getNodeByName(diagnostic.node)?.id;
}

function selectNode(diagnostic: CompileDiagnostic) {
	const id = nodeIdOf(diagnostic);
	if (!id) return;
	canvasEventBus.emit('nodes:select', { ids: [id], panIntoView: true });
	isOpen.value = false;
}
</script>

<template>
	<N8nPopover
		v-if="isCompiledWorkflow && status.state !== 'idle'"
		v-model:open="isOpen"
		width="360px"
		max-height="400px"
		align="start"
		enable-scrolling
	>
		<template #trigger>
			<N8nButton
				variant="ghost"
				size="small"
				:icon="icon"
				:loading="status.state === 'loading'"
				:class="[$style.trigger, $style[status.state]]"
				:title="i18n.baseText('compiledEngine.status.tooltip')"
				data-test-id="compiled-engine-status"
				data-attr="compiled-engine-status"
			>
				{{ label }}
			</N8nButton>
		</template>
		<template #content>
			<div :class="$style.panel" data-test-id="compiled-engine-panel">
				<N8nText bold size="small" tag="p">
					{{ i18n.baseText('compiledEngine.panel.title') }}
				</N8nText>
				<N8nText size="small" color="text-base" tag="p" data-test-id="compiled-engine-headline">
					{{ headline }}
				</N8nText>
				<N8nText
					v-if="result"
					size="xsmall"
					color="text-light"
					tag="p"
					data-test-id="compiled-engine-node-summary"
				>
					{{ nodeSummary }}
				</N8nText>
				<ul v-if="diagnostics.length > 0" :class="$style.list">
					<li v-for="(diagnostic, index) in diagnostics" :key="index">
						<component
							:is="nodeIdOf(diagnostic) ? 'button' : 'div'"
							:type="nodeIdOf(diagnostic) ? 'button' : undefined"
							:class="[$style.diagnostic, { [$style.clickable]: !!nodeIdOf(diagnostic) }]"
							:aria-label="
								nodeIdOf(diagnostic)
									? i18n.baseText('compiledEngine.panel.jumpToNode', {
											interpolate: { node: diagnostic.node ?? '' },
										})
									: undefined
							"
							data-test-id="compiled-engine-diagnostic"
							@click="selectNode(diagnostic)"
						>
							<N8nIcon
								:icon="severityIcon[diagnostic.severity]"
								:class="$style[diagnostic.severity]"
								:title="severityLabel(diagnostic.severity)"
								size="small"
							/>
							<span :class="$style.body">
								<span :class="$style.meta">
									<span v-if="diagnostic.node" :class="$style.node">{{ diagnostic.node }}</span>
									<code :class="$style.code">{{ diagnostic.code }}</code>
								</span>
								<span :class="$style.message">{{ diagnostic.message }}</span>
							</span>
						</component>
					</li>
				</ul>
				<N8nText
					v-else-if="result"
					size="small"
					color="text-light"
					tag="p"
					data-test-id="compiled-engine-no-diagnostics"
				>
					{{ i18n.baseText('compiledEngine.panel.noDiagnostics') }}
				</N8nText>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.trigger {
	flex-shrink: 0;
	margin-left: var(--spacing--3xs);

	&.ok {
		color: var(--text-color--success);
	}

	&.problems,
	&.failed {
		color: var(--text-color--danger);
	}
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);

	p {
		margin: 0;
	}
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: var(--spacing--3xs) 0 0;
	padding: 0;
	list-style: none;
}

.diagnostic {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--3xs);
	background: none;
	color: var(--text-color);
	font: inherit;
	font-size: var(--font-size--2xs);
	text-align: left;
}

.clickable {
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background: var(--background--hover);
	}
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.meta {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}

.node {
	font-weight: var(--font-weight--bold);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.code {
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
}

.message {
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
}

.error {
	flex-shrink: 0;
	color: var(--icon-color--danger);
}

.warning {
	flex-shrink: 0;
	color: var(--text-color--warning);
}

.info {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}
</style>
