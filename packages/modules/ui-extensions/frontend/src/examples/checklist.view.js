/* global Vue, n8n */
// The built-in "Checklist" view: quick checks of the open workflow, each with
// what to do when it fails.
const { computed } = Vue;

const STICKY_NOTE = 'n8n-nodes-base.stickyNote';

/** A node keeps its default name when it is the name n8n gave it, maybe with a number. */
function hasDefaultName(node) {
	const defaultName = node.defaultName ?? node.displayName;
	if (!defaultName || !node.name.startsWith(defaultName)) return false;
	return /^\d*$/.test(node.name.slice(defaultName.length));
}

export default {
	setup() {
		const context = n8n.useContext();
		const workflow = computed(() =>
			context.value.page === 'workflow' ? context.value.workflow : null,
		);
		const checks = computed(() => {
			const all = workflow.value?.nodes ?? [];
			const nodes = all.filter((node) => node.type !== STICKY_NOTE);
			const disabled = nodes.filter((node) => node.disabled).length;
			const defaultNames = nodes.filter(hasDefaultName).length;
			return [
				{ key: 'trigger', pass: nodes.some((node) => node.isTrigger), count: 0 },
				{ key: 'errorWorkflow', pass: workflow.value?.hasErrorWorkflow === true, count: 0 },
				{ key: 'disabled', pass: disabled === 0, count: disabled },
				{ key: 'names', pass: defaultNames === 0, count: defaultNames },
				{ key: 'notes', pass: all.some((node) => node.type === STICKY_NOTE), count: 0 },
			];
		});
		const passed = computed(() => checks.value.filter((check) => check.pass).length);
		const progress = computed(() => `${Math.round((passed.value / checks.value.length) * 100)}%`);
		return { context, workflow, checks, passed, progress, t: n8n.t };
	},
	template: `
		<section data-test-id="checklist" style="display: flex; flex-direction: column; gap: var(--spacing--sm)">
			<template v-if="context.page !== 'workflow'">
				<div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs); padding: var(--spacing--lg) 0; text-align: center">
					<N8nIcon icon="list-checks" size="xlarge" color="text-light" />
					<N8nText size="small" color="text-light">{{ t('uiExtensions.checklist.openWorkflow') }}</N8nText>
				</div>
			</template>
			<N8nCallout v-else-if="!workflow" theme="info">{{ t('uiExtensions.view.hiddenWorkflow') }}</N8nCallout>
			<template v-else>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs)">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.checklist.heading') }}</N8nHeading>
					<N8nText size="small" color="text-light" data-test-id="checklist-score">{{ t('uiExtensions.checklist.score', { passed, total: checks.length }) }}</N8nText>
					<div style="height: var(--spacing--4xs); border-radius: var(--radius); background-color: var(--background--subtle); overflow: hidden">
						<div :style="{ width: progress, height: '100%', backgroundColor: 'var(--icon-color--success)' }" />
					</div>
				</div>
				<N8nCallout v-if="passed === checks.length" theme="success">{{ t('uiExtensions.checklist.allPass') }}</N8nCallout>
				<N8nCard v-for="check in checks" :key="check.key" :data-test-id="'checklist-' + check.key" :data-pass="check.pass">
					<div style="display: flex; align-items: flex-start; gap: var(--spacing--2xs)">
						<N8nIcon :icon="check.pass ? 'circle-check' : 'triangle-alert'" size="medium" :color="check.pass ? 'success' : 'warning'" />
						<span style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
							<N8nText size="small" bold>{{ t('uiExtensions.checklist.' + check.key + '.title') }}</N8nText>
							<N8nText v-if="!check.pass" size="xsmall" color="text-light">{{ t('uiExtensions.checklist.' + check.key + '.help', { count: check.count }) }}</N8nText>
						</span>
					</div>
				</N8nCard>
			</template>
		</section>
	`,
};
