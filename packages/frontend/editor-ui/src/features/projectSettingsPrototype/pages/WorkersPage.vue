<script setup lang="ts">
import { computed, useId } from 'vue';
import { RouterLink } from 'vue-router';
import { N8nHeading, N8nSettingsSection, N8nStatusDot, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import SourceBadge from '@/features/projectSettingsPrototype/components/SourceBadge.vue';
import { DEFAULT_QUEUE, WORKER_POOLS } from '@/features/projectSettingsPrototype/data/instance';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import type { WorkerPool } from '@/features/projectSettingsPrototype/data/types';
import { resolveOverride } from '@/features/projectSettingsPrototype/state/resolve';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	projectState,
	setProjectWorkerPool,
	store,
} from '@/features/projectSettingsPrototype/state/store';

/**
 * The worker pool that runs this project's executions.
 *
 * The instance setting is the default queue. A project follows it until it
 * picks a pool of its own, and only while the instance lets projects choose.
 */
const props = defineProps<{ projectId: string }>();

interface PoolOption {
	pool: WorkerPool;
	/** The default queue is the instance setting, not a pool a project picks. */
	isDefault: boolean;
}

const OPTIONS: PoolOption[] = [
	{ pool: DEFAULT_QUEUE, isDefault: true },
	...WORKER_POOLS.map((pool) => ({ pool, isDefault: false })),
];

const can = useCan();
const toast = useToast();

const titleId = useId();
const groupName = useId();

const resolved = computed(() =>
	resolveOverride(
		DEFAULT_QUEUE.id,
		projectState(props.projectId).workerPoolId,
		store.instance.allowProjects.workerPool,
	),
);

/** The checked card: the default queue's id while the project follows the instance. */
const selectedId = computed(() => resolved.value.value);
const isLocked = computed(() => resolved.value.source === 'locked');
const isDisabled = computed(() => isLocked.value || !can('project:settings:edit'));

const isDegraded = (pool: WorkerPool) => pool.workersOnline < pool.workersTotal;

const workersLabel = (pool: WorkerPool) =>
	`${formatNumber(pool.workersOnline)} of ${formatNumber(pool.workersTotal)} ${
		pool.workersTotal === 1 ? 'worker' : 'workers'
	} online`;

const executionsLabel = (pool: WorkerPool) =>
	`${formatNumber(pool.runningExecutions)} ${
		pool.runningExecutions === 1 ? 'execution' : 'executions'
	} running`;

function select(option: PoolOption) {
	if (isDisabled.value || selectedId.value === option.pool.id) return;
	setProjectWorkerPool(props.projectId, option.isDefault ? undefined : option.pool.id);
	toast.showMessage({ title: 'Worker pool changed', type: 'success' });
}
</script>

<template>
	<div :class="$style.page" data-test-id="proto-workers-page">
		<N8nSettingsSection data-test-id="proto-workers-section">
			<template #title>
				<div :class="$style.sectionHeader">
					<N8nHeading :id="titleId" tag="h2" step="md" color="text-dark">Worker pool</N8nHeading>
					<SourceBadge :source="resolved.source" />
				</div>
			</template>
			<template v-if="isLocked" #description>
				<N8nText size="small" color="text-base" data-test-id="proto-workers-locked-note">
					Instance admins choose the worker pool for every project.
					<RouterLink
						v-if="can('instance:settings:view')"
						to="/settings/workers"
						:class="$style.link"
						data-test-id="proto-workers-instance-link"
					>
						Open instance worker settings
					</RouterLink>
				</N8nText>
			</template>

			<div
				:class="$style.pools"
				role="radiogroup"
				:aria-labelledby="titleId"
				:aria-disabled="isDisabled ? 'true' : undefined"
				data-test-id="proto-workers-pools"
			>
				<label
					v-for="option in OPTIONS"
					:key="option.pool.id"
					:class="[
						$style.pool,
						{
							[$style.selected]: selectedId === option.pool.id,
							[$style.disabled]: isDisabled,
						},
					]"
					:data-test-id="`proto-workers-pool-${option.pool.id}`"
				>
					<input
						:class="$style.radio"
						type="radio"
						:name="groupName"
						:value="option.pool.id"
						:checked="selectedId === option.pool.id"
						:disabled="isDisabled"
						:aria-labelledby="`${groupName}-${option.pool.id}-name`"
						:aria-describedby="`${groupName}-${option.pool.id}-details`"
						:data-test-id="`proto-workers-radio-${option.pool.id}`"
						@change="select(option)"
					/>
					<span :class="$style.poolBody">
						<span :class="$style.poolTitle">
							<N8nText
								:id="`${groupName}-${option.pool.id}-name`"
								:class="{ [$style.identifier]: !option.isDefault }"
								bold
								color="text-dark"
							>
								{{ option.pool.name }}
							</N8nText>
							<N8nText v-if="option.isDefault" size="small" color="text-light">
								Instance setting
							</N8nText>
						</span>
						<span :id="`${groupName}-${option.pool.id}-details`" :class="$style.poolDetails">
							<N8nText size="small" color="text-light">{{ option.pool.description }}</N8nText>
							<span :class="$style.health">
								<span :class="[$style.workers, { [$style.degraded]: isDegraded(option.pool) }]">
									<N8nStatusDot :variant="isDegraded(option.pool) ? 'warning' : 'success'" />
									{{ workersLabel(option.pool) }}
								</span>
								<span>{{ executionsLabel(option.pool) }}</span>
							</span>
						</span>
					</span>
				</label>
			</div>

			<N8nText size="small" color="text-light" data-test-id="proto-workers-helper">
				New executions use the chosen pool. Running executions finish where they started.
			</N8nText>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/motion';

.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--sm);
}

.link {
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
	text-decoration: underline;
	text-underline-offset: var(--spacing--5xs);
	border-radius: var(--radius--4xs);

	&:hover {
		color: var(--text-color--subtle);
	}

	@include focus.focus-visible-ring-offset;
}

.pools {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.pool {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-color: var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	cursor: pointer;
	transition: border-color var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;

	@media (hover: hover) and (pointer: fine) {
		&:hover {
			border-color: var(--border-color--strong);
		}
	}

	// The radio is the focus target. The ring goes around its whole card.
	&:has(.radio:focus-visible) {
		@include focus.focus-ring-offset;
	}
}

.selected,
.selected:hover {
	border-color: var(--color--primary);
}

// Disabled cards stay readable. Only the control and the pointer say they can't change.
.disabled {
	cursor: not-allowed;

	&,
	&:hover {
		border-color: var(--border-color--subtle);
	}

	&.selected,
	&.selected:hover {
		border-color: var(--border-color--stronger);
	}
}

// Drawn like the design system's radio, on a real input so the browser handles the keys.
.radio {
	position: relative;
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	// Centers the control on the first line of text.
	margin: var(--spacing--5xs) 0 0;
	border: var(--border);
	border-radius: var(--radius--full);
	background-color: var(--background--surface);
	appearance: none;
	cursor: inherit;

	&::after {
		position: absolute;
		top: 50%;
		left: 50%;
		width: var(--spacing--3xs);
		height: var(--spacing--3xs);
		border-radius: var(--radius--full);
		background-color: var(--background--surface);
		content: '';
		opacity: 0;
		transform: translate(-50%, -50%);
	}

	&:checked {
		border-color: var(--background--brand--hover);
		background-color: var(--background--brand);

		&::after {
			opacity: 1;
		}
	}

	&:disabled {
		border-color: var(--border-color--subtle);
	}

	&:disabled:checked {
		border-color: var(--background--disabled);
		background-color: var(--background--disabled);
	}

	&:focus {
		outline: none;
	}
}

.poolBody {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.poolTitle {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

// Pool names are the identifiers workers register with.
.identifier {
	font-family: var(--font-family--monospace);
}

.poolDetails {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.health {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	column-gap: var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
	line-height: var(--line-height--lg);

	> * + * {
		padding-inline-start: var(--spacing--2xs);
		border-inline-start: var(--border);
	}
}

.workers {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.degraded {
	color: var(--text-color--warning);
}
</style>
