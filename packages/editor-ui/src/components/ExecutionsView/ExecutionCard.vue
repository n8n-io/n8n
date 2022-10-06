<template>
	<div
		:class="{
			['execution-card']: true,
			[$style.executionCard]: true,
			[$style.active]: activeExecution && execution.id === activeExecution.id,
			[$style[executionUIDetails.name]]: true,
		}"
	>
		<router-link
			:class="$style.executionLink"
			:to="{ name: VIEWS.EXECUTION_PREVIEW, params: { workflowId: currentWorkflow, executionId: execution.id }}"
		>
			<div :class="$style.description">
				<n8n-text color="text-dark" :bold="true" size="medium">{{ executionUIDetails.startTime }}</n8n-text>
				<div>
					<n8n-text :class="$style.statusLabel" size="small">{{ executionUIDetails.statusLabel }}</n8n-text>
					<n8n-text color="text-base" size="small"> in {{ executionUIDetails.runningTime }}</n8n-text>
				</div>
			</div>
			<div :class="$style.icons">
			</div>
		</router-link>
	</div>
</template>

<script lang="ts">
import { IExecutionsSummary } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { executionHelpers, IExecutionUIData } from '../mixins/executionsHelpers';
import { VIEWS } from '../../constants';

export default mixins(executionHelpers).extend({
	name: 'execution-card',
	data() {
		return {
			VIEWS,
		};
	},
	props: {
		execution: {
			type: Object as () => IExecutionsSummary,
			required: true,
		},
	},
	computed: {
		executionUIDetails(): IExecutionUIData {
			return this.getExecutionUIDetails(this.execution);
		},
	},
});
</script>

<style module lang="scss">
.executionCard {
	display: flex;
	padding: var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) 0;

	&:hover, &.active {
		border-left: 4px solid transparent !important;

		.executionLink {
			background-color: #DBDFE7;
		}
	}

	&.success {
		&, & .executionLink {
			border-left: 4px solid #29A568;
		}
	}
	&.waiting {
		&, & .executionLink {
			border-left: 4px solid #5C4EC2;
		}
		.statusLabel { color: #5C4EC2; }
	}
	&.error {
		&, & .executionLink {
			border-left: 4px solid #FF6D5A;
		}
		.statusLabel { color: #FF6D5A; }
	}
}

.executionLink {
	display: block;
	width: 100%;
	color: var(--color-text-base);
	font-size: var(--font-size-xs);
	padding: var(--spacing-xs) var(--spacing-xs) var(--spacing-xs) var(--spacing-s);
	border-radius: 4px;
	position: relative;
	left: -4px;
}
</style>
