<script setup lang="ts">
type Summary = {
	id: string;
	title: string;
	count: number;
	sign?: string;
	deviation: number;
	evaluation?: 'positive' | 'negative';
};
defineProps<{
	summaries: Summary[];
}>();

const getSign = (count: number) => (count > 0 ? '+' : undefined);
</script>

<template>
	<div :class="$style.insights">
		<N8nHeading bold tag="h3" size="medium" class="mb-xs"
			>Production executions for the last 7 days</N8nHeading
		>
		<ul>
			<li v-for="{ id, title, count, sign, deviation, evaluation } in summaries" :key="id">
				<p>
					<strong>{{ title }}</strong>
					<span>
						<em
							>{{ count }} <i>{{ sign }}</i></em
						>
						<small :class="evaluation === 'positive' ? $style.up : $style.down">
							<N8nIcon
								:class="[$style.icon, evaluation === 'positive' ? $style.up : $style.down]"
								:icon="evaluation === 'positive' ? 'caret-up' : 'caret-down'"
								color="text-light"
							/>
							{{ getSign(deviation) }} {{ deviation }}
						</small>
					</span>
				</p>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.insights {
	padding: var(--spacing-xs) 0 var(--spacing-2xl);

	ul {
		display: flex;
		height: 91px;
		align-items: stretch;
		justify-content: flex-start;
		border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
		border-radius: 6px;
		list-style: none;
		background-color: var(--color-background-xlight);

		li {
			display: flex;
			justify-content: center;
			align-items: center;
			border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
			padding: 0 var(--spacing-xl) 0 var(--spacing-l);
		}

		p {
			display: grid;

			strong {
				color: var(--color-text-dark);
				font-size: 14px;
				font-weight: 400;
				white-space: nowrap;
				margin-bottom: var(--spacing-2xs);
			}

			span {
				display: flex;
				align-items: baseline;
				gap: var(--spacing-xs);
			}

			em {
				display: flex;
				align-items: baseline;
				justify-content: flex-start;
				color: var(--color-text-dark);
				font-size: 32px;
				line-height: 100%;
				font-weight: 600;
				font-style: normal;
				gap: var(--spacing-5xs);

				i {
					color: var(--color-text-light);
					font-size: 22px;
					font-style: normal;
				}
			}

			small {
				position: relative;
				display: flex;
				align-items: center;
				padding: 0 0 0 18px;
				font-size: 14px;
				font-weight: 400;
				white-space: nowrap;
			}
		}
	}
}

.up {
	color: var(--color-success);
}

.down {
	color: var(--color-danger);
}

.icon {
	position: absolute;
	font-size: 32px;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
}
</style>
