<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { AgentOnlineActivityItem, AgentOnlineCheck, AgentOnlineRubric } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { updateOnlineCheck } from '../agentEvals.api';

const props = defineProps<{
	rubric: AgentOnlineRubric;
	activity: AgentOnlineActivityItem[];
	projectId: string;
	agentId: string;
	disabled?: boolean;
	historyState?: 'loading' | 'error' | 'ready';
}>();
const emit = defineEmits<{
	updated: [rubric: AgentOnlineRubric];
	assessment: [item: AgentOnlineActivityItem];
}>();
const i18n = useI18n();
const root = useRootStore();
const builtIn = computed(() => props.rubric.checks.filter((check) => check.kind !== 'promise'));
const specific = computed(() => props.rubric.checks.filter((check) => check.kind === 'promise'));
const editing = ref<string | null>(null);
const question = ref('');
const reason = ref('');
const appliesWhen = ref('');
const saving = ref(false);
const error = ref('');
let requestId = 0;
watch(
	() => [props.agentId, props.projectId],
	() => {
		requestId += 1;
		editing.value = null;
		saving.value = false;
		error.value = '';
	},
);
onBeforeUnmount(() => {
	requestId += 1;
});
function edit(check: AgentOnlineCheck) {
	editing.value = check.id;
	question.value = check.question;
	reason.value = check.reason;
	appliesWhen.value = check.appliesWhen ?? '';
	error.value = '';
}
async function save() {
	if (
		!editing.value ||
		props.disabled ||
		saving.value ||
		!question.value.trim() ||
		!reason.value.trim()
	)
		return;
	const current = requestId;
	saving.value = true;
	error.value = '';
	try {
		const rubric = await updateOnlineCheck(
			root.restApiContext,
			props.projectId,
			props.agentId,
			editing.value,
			{ question: question.value, reason: reason.value, appliesWhen: appliesWhen.value || null },
		);
		if (current !== requestId) return;
		emit('updated', rubric);
		editing.value = null;
	} catch (cause) {
		if (current === requestId) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		if (current === requestId) saving.value = false;
	}
}
function history(check: AgentOnlineCheck) {
	return props.activity
		.filter((item) =>
			item.result.rubric.checks.some(
				(recorded) =>
					recorded.id === check.id &&
					recorded.question === check.question &&
					recorded.appliesWhen === check.appliesWhen &&
					recorded.source.quote === check.source.quote,
			),
		)
		.map((item) => ({
			item,
			verdict: item.result.verdicts.find((verdict) => verdict.checkId === check.id),
		}))
		.filter((entry) => entry.verdict)
		.slice(0, 5)
		.toReversed();
}
function resultLabel(item: AgentOnlineActivityItem, status: string) {
	const { date, time } = convertToDisplayDate(item.result.checkedAt);
	return `${item.title} · ${date} ${time} · ${status}`;
}
</script>

<template>
	<section :class="$style.rubric" data-testid="agent-online-rubric-review">
		<div :class="$style.builtIn">
			<div :class="$style.heading">
				<N8nText tag="h3" size="medium" bold>{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.review.always', {
						interpolate: { count: String(builtIn.length) },
					})
				}}</N8nText>
				<N8nText size="small" color="text-base">{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.review.everyAgent')
				}}</N8nText>
			</div>
			<ul :class="$style.list">
				<li v-for="check in builtIn" :key="check.id">
					<span :class="$style.neutralDot" aria-hidden="true" /><N8nText size="small">{{
						check.question
					}}</N8nText>
				</li>
			</ul>
		</div>
		<div :class="$style.heading">
			<N8nText tag="h3" size="medium" bold>{{
				i18n.baseText('agents.builder.agentEvals.onlineChecks.review.forAgent', {
					interpolate: { count: String(specific.length) },
				})
			}}</N8nText>
			<N8nText size="small" color="text-base">{{
				i18n.baseText('agents.builder.agentEvals.onlineChecks.review.fromInstructions')
			}}</N8nText>
		</div>
		<N8nText v-if="!specific.length" size="small" color="text-base">{{
			i18n.baseText('agents.builder.agentEvals.onlineChecks.review.noSpecific')
		}}</N8nText>
		<div v-else :class="$style.tableWrap">
			<table :class="$style.table">
				<thead>
					<tr>
						<th>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.question') }}</th>
						<th>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.applies') }}</th>
						<th>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.lastFive') }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="check in specific" :key="check.id" data-testid="agent-online-rubric-rule">
						<td>
							<details :class="$style.ruleDetails">
								<summary>
									<N8nText size="small" bold>{{ check.question }}</N8nText>
								</summary>
								<div :class="$style.ruleBody">
									<N8nText size="small" color="text-base">{{ check.reason }}</N8nText>
									<blockquote v-if="check.source.quote" :class="$style.quote">
										{{ check.source.quote }}
									</blockquote>
									<template v-if="editing === check.id">
										<form :class="$style.form" @submit.prevent="save">
											<label :for="`online-question-${check.id}`">{{
												i18n.baseText('agents.builder.agentEvals.onlineChecks.review.questionLabel')
											}}</label>
											<N8nInput
												:id="`online-question-${check.id}`"
												v-model="question"
												type="textarea"
												:disabled="saving"
											/>
											<label :for="`online-reason-${check.id}`">{{
												i18n.baseText('agents.builder.agentEvals.onlineChecks.review.reasonLabel')
											}}</label>
											<N8nInput
												:id="`online-reason-${check.id}`"
												v-model="reason"
												type="textarea"
												:disabled="saving"
											/>
											<label :for="`online-applies-${check.id}`">{{
												i18n.baseText('agents.builder.agentEvals.onlineChecks.review.applies')
											}}</label>
											<N8nInput
												:id="`online-applies-${check.id}`"
												v-model="appliesWhen"
												type="textarea"
												:disabled="saving"
												:placeholder="
													i18n.baseText(
														'agents.builder.agentEvals.onlineChecks.review.alwaysApplies',
													)
												"
											/>
											<N8nText size="xsmall" color="text-base">{{
												i18n.baseText('agents.builder.agentEvals.onlineChecks.review.editHint')
											}}</N8nText>
											<N8nCallout v-if="error" theme="danger">{{ error }}</N8nCallout>
											<div :class="$style.actions">
												<N8nButton variant="ghost" :disabled="saving" @click="editing = null">{{
													i18n.baseText('generic.cancel')
												}}</N8nButton
												><N8nButton
													type="submit"
													:loading="saving"
													:disabled="disabled || saving || !question.trim() || !reason.trim()"
													>{{
														i18n.baseText('agents.builder.agentEvals.onlineChecks.review.saveRule')
													}}</N8nButton
												>
											</div>
										</form>
									</template>
									<N8nButton
										v-else
										variant="outline"
										size="small"
										:disabled="disabled || saving"
										@click="edit(check)"
										>{{
											i18n.baseText('agents.builder.agentEvals.onlineChecks.review.editRule')
										}}</N8nButton
									>
								</div>
							</details>
						</td>
						<td>
							<N8nText size="small" color="text-base">{{
								check.appliesWhen ||
								i18n.baseText('agents.builder.agentEvals.onlineChecks.review.alwaysApplies')
							}}</N8nText>
						</td>
						<td>
							<div :class="$style.history">
								<button
									v-for="entry in history(check)"
									:key="entry.item.result.id"
									type="button"
									:class="[$style.historyButton, $style[entry.verdict?.status ?? 'not_run']]"
									:title="
										resultLabel(
											entry.item,
											i18n.baseText(
												`agents.builder.agentEvals.onlineChecks.sessions.verdict.${entry.verdict?.status ?? 'not_run'}`,
											),
										)
									"
									:aria-label="
										resultLabel(
											entry.item,
											i18n.baseText(
												`agents.builder.agentEvals.onlineChecks.sessions.verdict.${entry.verdict?.status ?? 'not_run'}`,
											),
										)
									"
									@click="emit('assessment', entry.item)"
								>
									<span :class="$style.dot" aria-hidden="true" />
								</button>
								<N8nText v-if="!history(check).length" size="xsmall" color="text-base">{{
									i18n.baseText(
										historyState === 'loading'
											? 'agents.builder.agentEvals.onlineChecks.review.loadingHistory'
											: historyState === 'error'
												? 'agents.builder.agentEvals.onlineChecks.review.historyUnavailable'
												: 'agents.builder.agentEvals.onlineChecks.review.notChecked',
									)
								}}</N8nText>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</template>

<style lang="scss" module>
.rubric,
.ruleBody,
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.builtIn {
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	padding: var(--spacing--sm);
}
.heading,
.actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--xs);
}
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0;
	margin: var(--spacing--sm) 0 0;
	list-style: none;
	li {
		display: flex;
		align-items: baseline;
		gap: var(--spacing--2xs);
	}
}
.neutralDot,
.dot {
	display: inline-block;
	flex: none;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: currentColor;
}
.neutralDot {
	color: var(--text-color--subtler);
}
.tableWrap {
	overflow-x: auto;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}
.table {
	border-collapse: collapse;
	text-align: left;
	width: 100%;
	min-width: calc(var(--spacing--5xl) * 2);
	th,
	td {
		padding: var(--spacing--sm);
		vertical-align: top;
	}
	th {
		font-size: var(--font-size--2xs);
		color: var(--text-color--subtler);
		font-weight: var(--font-weight--regular);
	}
	tbody tr {
		border-top: var(--border-width) var(--border-style) var(--border-color);
	}
	td:first-child {
		width: 55%;
	}
	td:nth-child(2) {
		width: 30%;
	}
}
.ruleDetails summary {
	cursor: pointer;
	overflow-wrap: anywhere;
}
.ruleBody {
	padding-top: var(--spacing--sm);
	align-items: flex-start;
}
.quote {
	margin: 0;
	padding: var(--spacing--xs);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
	overflow-wrap: anywhere;
}
.form {
	width: 100%;
	font-size: var(--font-size--2xs);
}
.actions {
	align-self: flex-end;
	justify-content: flex-end;
}
.history {
	display: flex;
	width: max-content;
}
.historyButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 0;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	padding: 0;
	&:hover {
		background: var(--background--subtle);
	}
	&:focus-visible {
		outline: var(--border-width) solid var(--color--primary);
	}
}
.pass {
	color: var(--color--success);
}
.fail {
	color: var(--color--danger);
}
.unsure,
.not_run {
	color: var(--color--warning);
}
.not_applicable {
	color: var(--text-color--subtler);
}
</style>
