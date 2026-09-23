<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogTitle,
	N8nIcon,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PromotionBindingConsumer } from '@n8n/api-types';
import { usePromotionBindings } from '../composables/usePromotionBindings';
import type {
	AppliedResult,
	BlockedApplyResult,
	CreatedPromotionBinding,
	CreatePromotionBinding,
	MissingPromotionBinding,
	SourceChangedResult,
} from '../promotions.types';

const props = defineProps<{
	open: boolean;
	blockedResult: BlockedApplyResult;
	createBinding: CreatePromotionBinding;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	applied: [result: AppliedResult];
	'source-changed': [result: SourceChangedResult];
	'close-requested': [resources: CreatedPromotionBinding[]];
}>();

const i18n = useI18n();
const title = useTemplateRef<HTMLElement>('title');
const bindings = usePromotionBindings();
const {
	preflight,
	groups,
	unresolvedCount,
	savedResources,
	isBusy,
	isSubmitting,
	isCreating,
	sourceChanged,
	error,
	canContinue,
} = bindings;

watch(
	() => props.open,
	(open) => {
		if (open) bindings.start(props.blockedResult);
		else bindings.end();
	},
	{ immediate: true },
);
onBeforeUnmount(bindings.end);

const errorDetail = computed(() =>
	error.value?.kind === 'continue' && error.value.cause instanceof Error
		? error.value.cause.message
		: undefined,
);

function close() {
	if (!props.open || isBusy.value) return;
	emit('close-requested', savedResources.value);
	emit('update:open', false);
}

function preventBusyDismissal(event: Event) {
	if (isBusy.value) event.preventDefault();
}

function focusTitle(event: Event) {
	event.preventDefault();
	void nextTick(() => title.value?.focus());
}

function destinationScope(binding: MissingPromotionBinding) {
	if (binding.kind === 'credential') return binding.ownerProject.name;
	return binding.scope.kind === 'global'
		? i18n.baseText('promotions.bindings.global')
		: binding.scope.project.name;
}

function consumerNames(consumers: PromotionBindingConsumer[]) {
	return consumers
		.map((consumer) =>
			i18n.baseText('promotions.bindings.consumers', {
				interpolate: {
					project: consumer.project.name,
					workflows: consumer.workflows.map((workflow) => workflow.name).join(', '),
				},
			}),
		)
		.join('; ');
}

async function create(key: string, event: MouseEvent) {
	const trigger = event.currentTarget;
	const row = trigger instanceof HTMLElement ? trigger.closest('tr') : null;
	await bindings.createBinding(key, props.createBinding);
	await nextTick();
	if (!props.open || !row?.isConnected) return;
	if (trigger instanceof HTMLButtonElement && trigger.isConnected && !trigger.disabled) {
		trigger.focus();
	} else {
		row.focus();
	}
}

async function continueApply() {
	const result = await bindings.continueApply();
	if (result?.status === 'applied') {
		emit('applied', result);
		emit('update:open', false);
	} else if (result?.status === 'source-changed') {
		emit('source-changed', result);
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="fit"
		:show-close-button="!isBusy"
		:trap-focus="!isCreating"
		@open-auto-focus="focusTitle"
		@update:open="close"
		@escape-key-down="preventBusyDismissal"
		@interact-outside="preventBusyDismissal"
	>
		<form :class="$style.form" @submit.prevent="continueApply">
			<header :class="$style.header">
				<N8nButton
					type="button"
					variant="ghost"
					size="small"
					icon="arrow-left"
					icon-only
					:aria-label="i18n.baseText('promotions.bindings.back')"
					:disabled="isBusy"
					@click="close"
				/>
				<div>
					<N8nDialogTitle as-child>
						<h2 ref="title" :class="$style.title" tabindex="-1">
							{{ i18n.baseText('promotions.bindings.title') }}
						</h2>
					</N8nDialogTitle>
					<N8nDialogDescription :class="$style.subtitle">
						{{ i18n.baseText('promotions.bindings.subtitle') }}
					</N8nDialogDescription>
				</div>
			</header>
			<div :class="$style.body" data-test-id="promotion-bindings-body">
				<p :class="$style.description">{{ i18n.baseText('promotions.bindings.description') }}</p>
				<N8nCallout v-if="sourceChanged" theme="warning">
					{{ i18n.baseText('promotions.bindings.sourceChanged') }}
				</N8nCallout>
				<N8nCallout v-if="error" theme="danger">
					{{ i18n.baseText(`promotions.bindings.error.${error.kind}`) }}
					<p v-if="errorDetail">{{ errorDetail }}</p>
				</N8nCallout>
				<section v-for="group in groups" :key="group.project.id" :class="$style.project">
					<h3 v-if="groups.length > 1" :class="$style.projectName">{{ group.project.name }}</h3>
					<section v-for="entry in group.workflows" :key="entry.workflow.id">
						<h4 :class="$style.workflow">
							<N8nIcon icon="workflow" size="small" />
							<span>{{ entry.workflow.name }}</span>
						</h4>
						<div :class="$style.tableContainer">
							<table :class="$style.table" :aria-label="entry.workflow.name">
								<colgroup>
									<col :class="$style.sourceColumn" />
									<col :class="$style.destinationColumn" />
									<col :class="$style.statusColumn" />
								</colgroup>
								<thead>
									<tr>
										<th scope="col">{{ i18n.baseText('promotions.bindings.source') }}</th>
										<th scope="col">{{ i18n.baseText('promotions.bindings.destination') }}</th>
										<th scope="col">{{ i18n.baseText('promotions.bindings.status') }}</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="row in entry.rows" :key="row.key" tabindex="-1">
										<td>
											<div :class="$style.sourceItem">
												<N8nIcon
													:icon="row.binding.kind === 'credential' ? 'key-round' : 'json'"
													size="small"
													aria-hidden="false"
													:aria-label="
														i18n.baseText(`promotions.bindings.kind.${row.binding.kind}`)
													"
												/>
												<span :class="$style.name">{{ row.binding.name }}</span>
											</div>
										</td>
										<td>
											<div :class="$style.destination">
												<div
													:class="[
														$style.destinationItem,
														row.status === 'missing' && $style.pendingItem,
													]"
												>
													<span :class="$style.name">{{
														row.status === 'missing'
															? i18n.baseText('promotions.bindings.notCreated')
															: (row.created?.name ?? row.binding.name)
													}}</span>
													<N8nIcon
														v-if="row.status === 'missing'"
														icon="circle-alert"
														size="small"
													/>
												</div>
												<N8nButton
													v-if="row.status === 'missing'"
													type="button"
													variant="outline"
													size="small"
													icon="plus"
													icon-only
													:disabled="isBusy || sourceChanged"
													:aria-label="
														i18n.baseText('promotions.bindings.createNamed', {
															interpolate: { name: row.binding.name },
														})
													"
													@click="create(row.key, $event)"
												/>
											</div>
											<div :class="$style.scope">{{ destinationScope(row.binding) }}</div>
										</td>
										<td aria-live="polite">
											<span
												:class="[
													$style.status,
													row.status === 'resolved' ? $style.resolved : $style.pending,
												]"
											>
												<N8nIcon
													:icon="row.status === 'resolved' ? 'circle-check' : 'circle-alert'"
													size="small"
												/>
												{{ i18n.baseText(`promotions.bindings.status.${row.status}`) }}
											</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</section>
				</section>
				<section v-if="preflight?.accessRequirements.length" :class="$style.notices">
					<h3>{{ i18n.baseText('promotions.bindings.access.title') }}</h3>
					<N8nCallout
						v-for="item in preflight.accessRequirements"
						:key="item.sourceId"
						theme="warning"
					>
						<strong>{{ item.name }}</strong>
						<p>{{ i18n.baseText('promotions.bindings.access.description') }}</p>
						<p>{{ consumerNames(item.consumers) }}</p>
					</N8nCallout>
				</section>
				<section v-if="preflight?.conflicts.length" :class="$style.notices">
					<h3>{{ i18n.baseText('promotions.bindings.conflicts.title') }}</h3>
					<N8nCallout v-for="(item, index) in preflight.conflicts" :key="index" theme="warning">
						<strong>{{ item.kind === 'project' ? item.project.name : item.name }}</strong>
						<p>{{ i18n.baseText(`promotions.bindings.conflicts.${item.code}`) }}</p>
						<p v-if="item.kind !== 'project'">{{ consumerNames(item.consumers) }}</p>
						<p v-else>{{ item.workflows.map((workflow) => workflow.name).join(', ') }}</p>
					</N8nCallout>
				</section>
				<p v-if="preflight?.accessRequirements.length || preflight?.conflicts.length">
					{{ i18n.baseText('promotions.bindings.restart') }}
				</p>
				<section v-if="preflight?.warnings.length" :class="$style.notices">
					<h3>{{ i18n.baseText('promotions.bindings.warnings.title') }}</h3>
					<N8nCallout v-for="(item, index) in preflight.warnings" :key="index" theme="info">
						{{
							i18n.baseText('promotions.bindings.warnings.variableShadowed', {
								interpolate: { name: item.name },
							})
						}}
						<p>{{ consumerNames(item.consumers) }}</p>
					</N8nCallout>
				</section>
			</div>
			<div :class="$style.footer">
				<p v-if="savedResources.length" :class="$style.savedResources">
					{{ i18n.baseText('promotions.bindings.savedResources') }}
				</p>
				<N8nDialogFooter :class="$style.actions">
					<span :class="$style.count" role="status">
						{{
							i18n.baseText('promotions.bindings.unresolvedCount', {
								adjustToNumber: unresolvedCount,
								interpolate: { count: unresolvedCount },
							})
						}}
					</span>
					<N8nButton type="button" variant="outline" size="small" :disabled="isBusy" @click="close">
						{{ i18n.baseText('promotions.bindings.close') }}
					</N8nButton>
					<N8nButton type="submit" size="small" :disabled="!canContinue" :loading="isSubmitting">
						{{ i18n.baseText('promotions.bindings.continue') }}
					</N8nButton>
				</N8nDialogFooter>
			</div>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	margin: calc(-1 * var(--spacing--lg));
	// The design uses a 704 × 640 dialog. There are no matching size tokens.
	width: min(44rem, calc(100dvw - var(--spacing--lg)));
	height: min(40rem, calc(100dvh - var(--spacing--xl)));
	color: var(--text-color);
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--2xl) var(--spacing--sm) var(--spacing--md);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.subtitle {
	line-height: var(--line-height--xs);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}

.title:focus {
	outline: none;
}

.body {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: var(--spacing--md);
	min-height: 0;
	padding: var(--spacing--md) var(--spacing--lg);
	overflow: auto;
	overflow-wrap: anywhere;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.description {
	line-height: var(--line-height--xl);
	color: var(--text-color--subtle);
}

.project,
.notices {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.projectName {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtler);
}

.workflow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);

	svg {
		color: var(--icon-color);
	}
}

.tableContainer {
	border: var(--border);
	border-radius: var(--radius--xs);
	overflow: hidden;
}

.table {
	width: 100%;
	table-layout: fixed;
	border-collapse: collapse;

	th {
		padding: var(--spacing--2xs) var(--spacing--xs);
		background: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--3xs);
		font-weight: var(--font-weight--regular);
	}

	th,
	td {
		text-align: left;
		vertical-align: middle;
	}

	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-top: var(--border);
	}
}

.sourceColumn,
.destinationColumn {
	width: 40%;
}
.statusColumn {
	width: 20%;
}

.sourceItem,
.destination,
.destinationItem,
.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;

	svg {
		flex-shrink: 0;
	}
}

.sourceItem {
	color: var(--text-color--subtle);
}
.sourceItem svg {
	color: var(--icon-color);
}

.name {
	display: block;
	min-width: 0;
	overflow-wrap: anywhere;
}

.destinationItem {
	flex: 1;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background: var(--background--subtle);
}

.pendingItem {
	border-color: var(--border-color--warning);
	color: var(--text-color--warning);
}

.scope {
	margin-top: var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
}

.status {
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
}
.pending {
	color: var(--text-color--warning);
}
.resolved {
	color: var(--text-color--success);
}

.notices h3 {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.footer {
	flex-shrink: 0;
	padding: var(--spacing--sm);
	border-top: var(--border);
}

.savedResources {
	margin-bottom: var(--spacing--xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.actions {
	margin-top: 0;
}

.count {
	margin-right: auto;
	align-self: center;
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
}
</style>
