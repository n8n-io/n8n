<template>
	<div :class="alertBoxClassNames" role="alert">
		<div :class="$style.content">
			<span v-if="showIcon || $slots.icon" :class="$style.icon">
				<n8n-icon v-if="showIcon" :icon="icon" />
				<slot v-else-if="$slots.icon" name="icon" />
			</span>
			<div :class="$style.text">
				<div v-if="$slots.title || title" :class="$style.title">
					<slot name="title">{{ title }}</slot>
				</div>
				<div
					v-if="$slots.default || description"
					:class="{ [$style.description]: true, [$style.hasTitle]: $slots.title || title }"
				>
					<slot>{{ description }}</slot>
				</div>
			</div>
		</div>
		<div v-if="$slots.aside" :class="$style.aside">
			<slot name="aside" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import N8nIcon from '../N8nIcon';

type AlertProps = {
	title?: string;
	type?: 'success' | 'warning' | 'info' | 'error';
	description?: string;
	center?: boolean;
	showIcon?: boolean;
	effect?: 'light' | 'dark';
	background?: boolean;
};

const props = withDefaults(defineProps<AlertProps>(), {
	type: 'info',
	effect: 'light',
	showIcon: true,
	background: true,
});

const icon = computed(() => {
	/* eslint-disable prettier/prettier */
	switch (props.type) {
	case 'success':
		return 'check-circle';
	case 'warning':
		return 'exclamation-triangle';
	case 'error':
		return 'times-circle';
	default:
		return 'info-circle';
	}
	/* eslint-enable */
});

const style = useCssModule();
const alertBoxClassNames = computed(() => {
	const classNames = ['n8n-alert', style.alert];
	if (props.type) {
		classNames.push(style[props.type]);
	}
	if (props.effect) {
		classNames.push(style[props.effect]);
	}
	if (props.center) {
		classNames.push(style.center);
	}
	if (props.background) {
		classNames.push(style.background);
	}
	return classNames;
});
</script>

<style lang="scss" module>
@import '../../css/common/var.scss';

.alert {
	display: flex;
	position: relative;
	min-height: 60px;
	border-bottom: 1px solid transparent;
	align-items: center;
	justify-content: space-between;
	padding: $alert-padding;

	&.center {
		justify-content: center;
	}

	&.success {
		&.light {
			color: var(--color-success);

			&.background {
				background-color: $color-success-lighter;
				border-color: var(--color-success);
			}

			.el-alert__description {
				color: var(--color-success);
			}
		}

		&.dark {
			color: $color-white;

			&:not(.background) {
				color: var(--color-success);
			}

			&.background {
				background-color: var(--color-success);
				border-color: $color-white;
			}
		}
	}

	&.info {
		&.light {
			color: var(--color-info);

			&.background {
				background-color: $alert-info-color;
				border-color: var(--color-info);
			}
		}

		&.dark {
			color: $color-white;

			&:not(.background) {
				color: var(--color-info);
			}

			&.background {
				background-color: var(--color-info);
				border-color: $color-white;
			}
		}

		.el-alert__description {
			color: var(--color-info);
		}
	}

	&.warning {
		&.light {
			color: var(--color-warning);

			&.background {
				background-color: $alert-warning-color;
				border-color: var(--color-warning);
			}

			.el-alert__description {
				color: var(--color-warning);
			}
		}

		&.dark {
			color: $color-white;

			&:not(.background) {
				color: var(--color-warning);
			}

			&.background {
				background-color: var(--color-warning);
				border-color: $color-white;
			}
		}
	}

	&.error {
		&.light {
			color: var(--color-danger);

			&.background {
				background-color: $alert-danger-color;
				border-color: var(--color-danger);
			}

			.el-alert__description {
				color: var(--color-danger);
			}
		}

		&.dark {
			color: $color-white;

			&:not(.background) {
				color: var(--color-danger);
			}

			&.background {
				background-color: var(--color-danger);
				border-color: $color-white;
			}
		}
	}
}

.content {
	display: inline-flex;
	align-items: center;
}

.icon {
	display: inline-flex;
	color: inherit;
	align-items: center;
	padding-left: var(--spacing-2xs);
	padding-right: var(--spacing-s);
}

.text {
	display: inline-flex;
	flex-direction: column;
	justify-content: center;
}

.title {
	font-size: $alert-title-font-size;
	line-height: 18px;
	font-weight: bold;
}

.description {
	font-size: $alert-description-font-size;

	&.hasTitle {
		margin: 5px 0 0 0;
	}
}

.aside {
	display: inline-flex;
	align-items: center;
	padding-left: var(--spacing-s);
}
</style>
