<script setup lang="ts">
import { N8nDropdownMenu, N8nIcon, N8nPopover, N8nTooltip } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { useStorage } from '@vueuse/core';
import { computed, onScopeDispose, ref, watch } from 'vue';

import type { AgentCheck, AgentChecksApi, AgentChecksCadence } from '../composables/useAgentChecks';
import type { AgentReviewQueue } from '../composables/useAgentReviewQueue';
import type { useWireframeReviewers } from '../composables/useWireframeReviewers';
import WireframeReviewerPlus from '@/app/components/wireframe/WireframeReviewerPlus.vue';

// Wireframe: who reviews this agent. People and the Tester are peers in one
// cluster; the Tester's checks live in the same popover. State is owned by the
// dock so the review card and the Sessions tab see the same thing.
const props = defineProps<{
	projectId: string;
	agentId: string;
	checks: AgentChecksApi;
	review: AgentReviewQueue;
	reviewers: ReturnType<typeof useWireframeReviewers>;
}>();

const emit = defineEmits<{ 'open-check': [check: AgentCheck]; review: [] }>();

const i18n = useI18n();
const usersStore = useUsersStore();

const checksApi = props.checks;
const { checks: checkRows, summary, cadence, isRunning, hasRun, shouldOfferAuto } = checksApi;

const popoverOpen = ref(false);

// First moment: before anything ran, the bar introduces the drafted checks one by
// one. Stops for good once the user has opened the panel on this agent.
const introSeen = useStorage<boolean>(
	computed(() => `N8N_AGENT_CHECKS_INTRO_SEEN:${props.agentId}`),
	false,
);
const introIndex = ref(-1); // -1 = the count line, 0..n-1 = a check
let introTimer: ReturnType<typeof setInterval> | undefined;
const introActive = computed(
	() => !introSeen.value && !hasRun.value && !isRunning.value && checkRows.value.length > 0,
);
watch(
	introActive,
	(active) => {
		clearInterval(introTimer);
		introIndex.value = -1;
		if (!active) return;
		introTimer = setInterval(() => {
			const n = checkRows.value.length;
			introIndex.value = introIndex.value >= n - 1 ? -1 : introIndex.value + 1;
		}, 3500);
	},
	{ immediate: true },
);
onScopeDispose(() => clearInterval(introTimer));
watch(popoverOpen, (open) => {
	if (open) introSeen.value = true;
});
const introCheck = computed(() =>
	introIndex.value >= 0 ? (checkRows.value[introIndex.value] ?? null) : null,
);
const barLabel = computed(() => {
	const c = introCheck.value;
	if (introActive.value && c) return `${kindLabel(c)} · ${c.input}`;
	return badgeLabel.value;
});

const wire = props.reviewers;
// Wireframe: the reviewer page is keyed by a plain token; a real one would be signed.
function reviewerPageHref(reviewerId: string) {
	return `/review/${[props.projectId, props.agentId, reviewerId].join('~')}`;
}
function onReview() {
	popoverOpen.value = false;
	emit('review');
}

// Your own avatar only earns its place once another human is in the room.
const me = computed(() => usersStore.currentUser);
const initials = computed(() =>
	[me.value?.firstName, me.value?.lastName]
		.map((p) => p?.trim().charAt(0) ?? '')
		.join('')
		.toUpperCase(),
);

const attentionCount = computed(() => props.review.attentionCount.value);

// The one readiness signal in the toolbar. Colour and words always agree.
type BadgeState = 'idle' | 'running' | 'needsEye' | 'flagged' | 'ok';
const badgeState = computed<BadgeState>(() => {
	const s = summary.value;
	if (s.total === 0) return checksApi.resolving.value ? 'running' : 'idle';
	if (s.flagged > 0) return 'flagged';
	if (s.needsEye > 0) return 'needsEye';
	if (s.running > 0 || isRunning.value) return 'running';
	if (s.ok > 0 && s.ok + s.error === s.total) return 'ok';
	return 'idle';
});
const badgeLabel = computed(() => {
	const s = summary.value;
	switch (badgeState.value) {
		case 'needsEye':
			return i18n.baseText('agents.builder.checks.bar.review', {
				adjustToNumber: s.needsEye,
				interpolate: { count: String(s.needsEye) },
			});
		case 'flagged':
			return i18n.baseText('agents.builder.checks.badge.flagged', {
				adjustToNumber: s.flagged,
				interpolate: { count: String(s.flagged) },
			});
		case 'idle':
			// Drafted but never run: an invitation, not a warning.
			return s.total > 0 && !hasRun.value
				? i18n.baseText('agents.builder.checks.badge.ready', {
						adjustToNumber: s.total,
						interpolate: { count: String(s.total) },
					})
				: i18n.baseText('agents.builder.checks.badge.idle');
		default:
			return i18n.baseText(`agents.builder.checks.badge.${badgeState.value}`);
	}
});

// Typed checks were drafted by the Tester; untyped ones were written by a person and need no label.
function kindLabel(check: AgentCheck) {
	return check.flavor
		? i18n.baseText(`agents.builder.preview.wireframe.evalPill.type.${check.flavor}.name`)
		: '';
}

function stateLabel(check: AgentCheck) {
	return i18n.baseText(`agents.builder.checks.state.${check.state}`);
}

const CADENCES: AgentChecksCadence[] = ['auto', 'every', 'before-publish', 'manual'];
const cadenceItems = computed<Array<DropdownMenuItemProps<AgentChecksCadence>>>(() =>
	CADENCES.map((id) => ({
		id,
		label: i18n.baseText(`agents.builder.checks.cadence.${id}`),
		checked: cadence.value === id,
	})),
);
const cadenceLabel = computed(() =>
	i18n.baseText(`agents.builder.checks.cadence.${cadence.value}`),
);
function onOpenCheck(check: AgentCheck) {
	popoverOpen.value = false;
	emit('open-check', check);
}

// "+ Add a check": a request plus one sentence of what to check.
const addOpen = ref(false);
const addInput = ref('');
const addWhat = ref('');
async function submitAdd() {
	if (!addInput.value.trim() || !addWhat.value.trim()) return;
	await checksApi.addCheck(addInput.value.trim(), addWhat.value.trim());
	addInput.value = '';
	addWhat.value = '';
	addOpen.value = false;
}
</script>

<template>
	<N8nPopover
		v-model:open="popoverOpen"
		width="min(46rem, calc(100vw - 2rem))"
		align="end"
		:side-offset="2"
		:collision-padding="16"
		:show-arrow="false"
	>
		<template #trigger>
			<button
				type="button"
				:class="[$style.badge, $style[`badge_${badgeState}`], { [$style.active]: popoverOpen }]"
				:aria-label="i18n.baseText('agents.builder.checks.badge.ariaLabel')"
				data-testid="agent-preview-checks-badge"
				:data-state="badgeState"
			>
				<span :class="[$style.avatar, $style.evalAgent, $style.barAvatar]">
					<N8nIcon v-if="isRunning || summary.running > 0" icon="loader-circle" :size="13" spin />
					<N8nIcon v-else icon="flask-conical" :size="13" />
				</span>
				<Transition name="wireframe-bar-fade" mode="out-in">
					<span :key="barLabel" :class="$style.badgeLabel" data-testid="agent-preview-bar-label">{{
						barLabel
					}}</span>
				</Transition>
				<span :class="$style.grow" />
				<template v-if="shouldOfferAuto && !popoverOpen">
					<span :class="$style.offerText">{{
						i18n.baseText('agents.builder.checks.autoOffer')
					}}</span>
					<span
						:class="$style.ghostButton"
						role="button"
						tabindex="0"
						@click.stop="checksApi.answerAutoOffer(false)"
						@keydown.enter.stop="checksApi.answerAutoOffer(false)"
					>
						{{ i18n.baseText('agents.builder.checks.autoOffer.notNow') }}
					</span>
					<span
						:class="$style.primaryButton"
						role="button"
						tabindex="0"
						data-testid="agent-preview-auto-accept"
						@click.stop="checksApi.answerAutoOffer(true)"
						@keydown.enter.stop="checksApi.answerAutoOffer(true)"
					>
						{{ i18n.baseText('agents.builder.checks.autoOffer.accept') }}
					</span>
				</template>
				<span v-else :class="$style.barHint">
					<N8nIcon :icon="popoverOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
				</span>
			</button>
		</template>
		<template #content>
			<div :class="$style.popover" data-testid="agent-preview-eval-agent-popover">
				<div :class="$style.reviewersRow">
					<N8nDropdownMenu
						:items="cadenceItems"
						placement="bottom-start"
						width="16rem"
						@select="cadence = $event"
					>
						<template #trigger>
							<button
								type="button"
								:class="$style.cadence"
								data-testid="agent-preview-checks-cadence"
							>
								{{ cadenceLabel }} <N8nIcon icon="chevron-down" :size="12" />
							</button>
						</template>
					</N8nDropdownMenu>
					<span :class="$style.grow" />
					<div :class="$style.cluster" data-testid="agent-preview-reviewers-cluster">
						<N8nTooltip
							v-if="me"
							:content="
								i18n.baseText('agents.builder.checks.you', {
									interpolate: { name: `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() },
								})
							"
							placement="bottom"
						>
							<span
								:class="[$style.avatar, $style.person]"
								data-testid="agent-preview-reviewer-you"
								>{{ initials }}</span
							>
						</N8nTooltip>
						<N8nTooltip
							v-for="r in wire.people.value"
							:key="r.id"
							:content="
								i18n.baseText('wireframe.reviewers.openPage', { interpolate: { name: r.name } })
							"
							placement="bottom"
						>
							<a
								:class="[$style.avatar, $style.person, $style.invited]"
								:href="reviewerPageHref(r.id)"
								target="_blank"
								rel="noopener"
								data-testid="agent-preview-reviewer-human"
							>
								{{ wire.initialsOf(r.name) }}
								<span v-if="r.attention > 0" :class="$style.count">{{ r.attention }}</span>
							</a>
						</N8nTooltip>
						<N8nTooltip
							:content="i18n.baseText('agents.builder.checks.evalAgent.tooltip')"
							placement="bottom"
						>
							<span
								:class="[$style.avatar, $style.evalAgent]"
								data-testid="agent-preview-reviewer-eval-agent"
							>
								<N8nIcon icon="flask-conical" :size="13" />
								<span v-if="summary.needsEye > 0" :class="[$style.count, $style.countWarning]">{{
									summary.needsEye
								}}</span>
							</span>
						</N8nTooltip>
						<N8nTooltip
							v-for="t in wire.testers.value"
							:key="t.id"
							:content="
								i18n.baseText('wireframe.reviewers.tester.tooltip', {
									interpolate: { name: t.name },
								})
							"
							placement="bottom"
						>
							<span
								:class="[$style.avatar, $style.customTester]"
								data-testid="agent-preview-reviewer-tester"
							>
								<N8nIcon icon="bot" :size="13" />
							</span>
						</N8nTooltip>
						<WireframeReviewerPlus
							:project-id="props.projectId"
							:exclude-agent-id="props.agentId"
							:reviewers="wire"
						/>
					</div>
				</div>

				<ul :class="$style.rows">
					<li v-for="check in checkRows" :key="check.rowId">
						<button
							type="button"
							:class="[$style.row, $style[`row_${check.state}`]]"
							:data-flavor="check.flavor ?? 'custom'"
							data-testid="agent-preview-check-row"
							@click="onOpenCheck(check)"
						>
							<span :class="[$style.dot, $style[`dot_${check.state}`]]" />
							<span :class="$style.kind">
								<span v-if="check.flavor" :class="[$style.authorInitials, $style.testerMini]">
									<N8nIcon icon="flask-conical" :size="11" />
								</span>
								<span v-else :class="$style.authorInitials">{{ initials }}</span>
								{{ kindLabel(check) }}
							</span>
							<span :class="$style.request">{{ check.input }}</span>
							<span :class="[$style.state, $style[`state_${check.state}`]]">{{
								stateLabel(check)
							}}</span>
						</button>
					</li>
					<li v-if="checkRows.length === 0" :class="$style.empty">
						{{
							i18n.baseText(
								checksApi.resolving.value
									? 'agents.builder.checks.drafting'
									: 'agents.builder.checks.none',
							)
						}}
					</li>
				</ul>

				<div v-if="addOpen" :class="$style.inviteForm" data-testid="agent-preview-add-check-form">
					<input
						v-model="addInput"
						:class="$style.inviteInput"
						type="text"
						:placeholder="i18n.baseText('agents.builder.checks.addCheck.request')"
					/>
					<input
						v-model="addWhat"
						:class="$style.inviteInput"
						type="text"
						:placeholder="i18n.baseText('agents.builder.checks.addCheck.what')"
						@keydown.enter.prevent="submitAdd"
					/>
					<div :class="$style.inviteActions">
						<span :class="$style.grow" />
						<button type="button" :class="$style.ghostButton" @click="addOpen = false">
							{{ i18n.baseText('agents.builder.checks.invite.cancel') }}
						</button>
						<button
							type="button"
							:class="$style.primaryButton"
							data-testid="agent-preview-add-check-save"
							@click="submitAdd"
						>
							{{ i18n.baseText('agents.builder.checks.addCheck.save') }}
						</button>
					</div>
				</div>

				<div :class="$style.footer">
					<button
						type="button"
						:class="$style.ghostButton"
						data-testid="agent-preview-add-check"
						@click="addOpen = !addOpen"
					>
						{{ i18n.baseText('agents.builder.checks.addCheck') }}
					</button>
					<span :class="$style.grow" />
					<button
						type="button"
						:class="hasRun ? $style.runAgain : $style.reviewButton"
						:disabled="isRunning || checkRows.length === 0"
						data-testid="agent-preview-checks-run"
						@click="checksApi.run()"
					>
						{{
							i18n.baseText(
								isRunning
									? 'agents.builder.checks.running'
									: hasRun
										? 'agents.builder.checks.runAgain'
										: 'agents.builder.checks.runChecks',
							)
						}}
					</button>
					<button
						v-if="hasRun && attentionCount > 0"
						type="button"
						:class="$style.reviewButton"
						data-testid="agent-preview-review-button"
						@click="onReview"
					>
						{{
							i18n.baseText('agents.builder.checks.review', {
								interpolate: { count: String(attentionCount) },
							})
						}}
					</button>
					<span v-else-if="hasRun" :class="$style.caughtUp">{{
						i18n.baseText('agents.builder.checks.caughtUp')
					}}</span>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.badge {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: 0;
	border-top: var(--wireframe--border);
	border-bottom: var(--wireframe--border);
	background: var(--wireframe--hover-fill);
	color: var(--wireframe--ink);
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--sm);
	letter-spacing: var(--wireframe--letter-spacing);
	text-align: left;
	cursor: pointer;

	&:hover,
	&.active {
		filter: brightness(0.97);
	}
}

.barAvatar {
	width: 1.5rem;
	height: 1.5rem;
	flex-shrink: 0;
}

.barHint {
	display: inline-flex;
	color: var(--text-color--subtler);
}

.badgeLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.offerText {
	color: var(--text-color);
	font-weight: var(--wireframe--body-weight);
	white-space: nowrap;
}

.badge_needsEye {
	background: color-mix(in srgb, var(--color--warning) 14%, var(--background--surface));
	color: var(--color--warning);
}
.badge_ok {
	background: color-mix(in srgb, var(--color--success) 14%, var(--background--surface));
	color: var(--color--success);
}
.badge_flagged {
	background: color-mix(in srgb, var(--color--danger) 12%, var(--background--surface));
	color: var(--color--danger);
}

.offerRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
	background: color-mix(in srgb, var(--color--warning) 8%, transparent);
	font-size: var(--font-size--sm);
}

.reviewersRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--xs);
	border-bottom: var(--border);
}

.rowLabel {
	margin-right: var(--spacing--2xs);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
}

.avatar {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 50%;
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--2xs);
	letter-spacing: var(--wireframe--letter-spacing);
	line-height: 1;
	user-select: none;
	border: var(--wireframe--border);
	background: var(--background--surface);
	color: var(--wireframe--ink);
}

.evalAgent {
	background: color-mix(in srgb, var(--color--warning) 18%, var(--background--surface));
	color: var(--color--warning);
}

.testerMini {
	background: color-mix(in srgb, var(--color--warning) 18%, var(--background--surface));
	color: var(--color--warning);
}

.customTester {
	border-style: dashed;
	border-color: var(--color--primary);
	color: var(--color--primary);
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.35;
	}
}

.pulse {
	animation: pulse 1.2s ease-in-out infinite;
}

.popover {
	display: flex;
	flex-direction: column;
	font-family: var(--wireframe--font-family);
	letter-spacing: var(--wireframe--letter-spacing);
	font-size: var(--font-size--md);
	color: var(--text-color);
}

.popoverHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--xs) var(--spacing--2xs);
}

.title {
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--md);
}

.cadence {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--sm);
	cursor: pointer;
}

.rows {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	max-height: 50vh;
	overflow: auto;
}

.row {
	display: grid;
	grid-template-columns: 0.7rem 10.5rem minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	border-bottom: var(--border);
	background: transparent;
	font: inherit;
	font-size: var(--font-size--sm);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}
}

.row_needsEye {
	background: color-mix(in srgb, var(--color--warning) 8%, transparent);
}

.row_flagged {
	background: color-mix(in srgb, var(--color--danger) 6%, transparent);
}

.dot {
	width: 0.6rem;
	height: 0.6rem;
	border-radius: 50%;
	border: var(--wireframe--border-width) solid var(--border-color--strong);
}

.dot_running {
	border-color: var(--color--warning);
	animation: pulse 1.2s ease-in-out infinite;
}
.dot_needsEye {
	background: var(--color--warning);
	border-color: var(--color--warning);
}
.dot_ok {
	background: var(--color--success);
	border-color: var(--color--success);
}
.dot_flagged,
.dot_error {
	background: var(--color--danger);
	border-color: var(--color--danger);
}

.kind {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-weight: var(--wireframe--font-weight);
	white-space: nowrap;
}

.authorInitials {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	height: 1.25rem;
	border-radius: 50%;
	border: var(--wireframe--border-width) solid var(--border-color--strong);
	background: color-mix(in srgb, var(--color--success) 20%, var(--background--surface));
	font-size: 0.6rem;
}

.request {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtler);
}

.state {
	white-space: nowrap;
	color: var(--text-color--subtler);
}
.state_ok {
	color: var(--color--success);
}
.state_needsEye {
	color: var(--color--warning);
	font-weight: var(--wireframe--font-weight);
}
.state_flagged,
.state_error {
	color: var(--color--danger);
}

.empty {
	padding: var(--spacing--sm) var(--spacing--xs);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	font-size: var(--font-size--sm);
}

.muted {
	color: var(--text-color--subtler);
}

.grow {
	flex: 1;
}

.runAgain {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	cursor: pointer;

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
}

.reviewButton {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--wireframe--ink);
	color: var(--background--surface);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	cursor: pointer;
}

.caughtUp {
	color: var(--color--success);
	font-weight: var(--wireframe--font-weight);
}

.cluster {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.person {
	background: color-mix(in srgb, var(--color--success) 20%, var(--background--surface));
}

.invited {
	background: color-mix(in srgb, var(--color--primary) 18%, var(--background--surface));
}

.count {
	position: absolute;
	right: -0.35rem;
	bottom: -0.3rem;
	min-width: 0.9rem;
	height: 0.9rem;
	padding: 0 0.15rem;
	border-radius: 0.45rem;
	background: var(--color--danger);
	color: #fff;
	border: 2px solid var(--background--surface);
	font-family: var(--font-family);
	font-size: 0.55rem;
	font-weight: var(--font-weight--bold);
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.countWarning {
	background: var(--color--warning);
}

.inviteForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border-bottom: var(--border);
}

.inviteInput {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
}

.inviteAccess {
	display: flex;
	gap: var(--spacing--2xs);
}

.accessOption {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	cursor: pointer;
	font-size: var(--font-size--2xs);
}

.accessActive {
	border-style: solid;
	border-color: var(--wireframe--ink);
}

.inviteActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.ghostButton,
.primaryButton {
	white-space: nowrap;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	cursor: pointer;
}

.primaryButton {
	background: var(--wireframe--ink);
	color: var(--background--surface);
}

:global(.wireframe-bar-fade-enter-active),
:global(.wireframe-bar-fade-leave-active) {
	transition: opacity 250ms ease;
}
:global(.wireframe-bar-fade-enter-from),
:global(.wireframe-bar-fade-leave-to) {
	opacity: 0;
}
</style>
