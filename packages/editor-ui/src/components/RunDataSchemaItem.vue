<script lang="ts" setup>
import { computed } from 'vue';
import { INodeUi, Schema } from '@/Interface';
import { checkExhaustive, shorten } from '@/utils';
import { getMappedExpression } from '@/utils/mappingUtils';

type Props = {
	schema: Schema;
	level: number;
	parent: Schema | null;
	subKey: string;
	paneType: 'input' | 'output';
	mappingEnabled: boolean;
	draggingPath: string;
	distanceFromActive: number;
	node: INodeUi | null;
};

const props = defineProps<Props>();

const isSchemaValueArray = computed(() => Array.isArray(props.schema.value));
const isSchemaParentTypeArray = computed(() => props.parent?.type === 'array');
const isFlat = computed(
	() =>
		props.level === 0 &&
		Array.isArray(props.schema.value) &&
		props.schema.value.every((v) => !Array.isArray(v.value)),
);
const key = computed((): string | undefined =>
	isSchemaParentTypeArray.value ? `[${props.schema.key}]` : props.schema.key,
);
const schemaName = computed(() =>
	isSchemaParentTypeArray.value ? `${props.schema.type}[${props.schema.key}]` : props.schema.key,
);
const text = computed(() =>
	Array.isArray(props.schema.value) ? '' : shorten(props.schema.value, 600, 0),
);

const getJsonParameterPath = (path: string): string =>
	getMappedExpression({
		nodeName: props.node!.name,
		distanceFromActive: props.distanceFromActive,
		path,
	});

const transitionDelay = (i: number) => `${i * 0.033}s`;

const getIconBySchemaType = (type: Schema['type']): string => {
	switch (type) {
		case 'object':
			return 'cube';
		case 'array':
			return 'list';
		case 'string':
		case 'null':
			return 'font';
		case 'number':
			return 'hashtag';
		case 'boolean':
			return 'check-square';
		case 'function':
			return 'code';
		case 'bigint':
			return 'calculator';
		case 'symbol':
			return 'sun';
		case 'undefined':
			return 'ban';
	}

	checkExhaustive(type);
};
</script>

<template>
	<div :class="$style.item" data-test-id="run-data-schema-item">
		<div
			v-if="level > 0 || (level === 0 && !isSchemaValueArray)"
			:title="schema.type"
			:class="{
				[$style.pill]: true,
				[$style.mappable]: mappingEnabled,
				[$style.dragged]: draggingPath === schema.path,
			}"
		>
			<span
				:class="$style.label"
				:data-value="getJsonParameterPath(schema.path)"
				:data-name="schemaName"
				:data-path="schema.path"
				:data-depth="level"
				data-target="mappable"
			>
				<font-awesome-icon :icon="getIconBySchemaType(schema.type)" size="sm" />
				<span v-if="isSchemaParentTypeArray">{{ parent.key }}</span>
				<span v-if="key" :class="{ [$style.arrayIndex]: isSchemaParentTypeArray }">{{ key }}</span>
			</span>
		</div>
		<span v-if="text" :class="$style.text">{{ text }}</span>
		<input v-if="level > 0 && isSchemaValueArray" :id="subKey" type="checkbox" checked />
		<label v-if="level > 0 && isSchemaValueArray" :class="$style.toggle" :for="subKey">
			<font-awesome-icon icon="angle-up" />
		</label>
		<div v-if="isSchemaValueArray" :class="{ [$style.sub]: true, [$style.flat]: isFlat }">
			<run-data-schema-item
				v-for="(s, i) in schema.value"
				:key="`${s.type}-${level}-${i}`"
				:schema="s"
				:level="level + 1"
				:parent="schema"
				:paneType="paneType"
				:subKey="`${paneType}_${s.type}-${level}-${i}`"
				:mappingEnabled="mappingEnabled"
				:draggingPath="draggingPath"
				:distanceFromActive="distanceFromActive"
				:node="node"
				:style="{ transitionDelay: transitionDelay(i) }"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
@import '@/styles/css-animation-helpers.scss';

.item {
	display: block;
	position: relative;
	transition: all 0.3s $ease-out-expo;

	.item {
		padding-top: var(--spacing-2xs);
		padding-left: var(--spacing-l);
	}

	input {
		position: absolute;
		left: -100%;

		~ .sub {
			height: 0;

			> .item {
				transform: translateX(-100%);
			}
		}

		&:checked {
			~ .toggle svg {
				transform: rotate(180deg);
			}

			~ .sub {
				height: auto;

				> .item {
					transform: translateX(0);
				}
			}
		}
	}

	&::after {
		content: '';
		display: block;
		clear: both;
	}
}

.sub {
	display: block;
	overflow: hidden;
	transition: all 0.2s $ease-out-expo;
	clear: both;

	&.flat {
		> .item {
			padding-left: 0;
		}
	}

	&:nth-of-type(1) {
		> .item:nth-of-type(1) {
			padding-top: 0;

			.toggle {
				top: -2px;
			}
		}
	}
}

.pill {
	float: left;
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: 4px;
	background-color: var(--color-background-xlight);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);

	span {
		display: flex;
		height: 100%;
		align-items: center;

		svg {
			path {
				fill: var(--color-text-light);
			}
		}
	}

	&.mappable {
		cursor: grab;

		&:hover {
			&,
			span span {
				background-color: var(--color-background-light);
				border-color: var(--color-foreground-base);
			}
		}
	}

	&.dragged {
		&,
		&:hover,
		span {
			color: var(--color-primary);
			border-color: var(--color-primary-tint-1);
			background-color: var(--color-primary-tint-3);

			svg {
				path {
					fill: var(--color-primary);
				}
			}
		}
	}
}

.label {
	> span {
		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid var(--color-foreground-light);

		&.arrayIndex {
			border: 0;
			padding-left: 0;
			margin-left: 0;
		}
	}
}

.text {
	display: block;
	padding-top: var(--spacing-4xs);
	padding-left: var(--spacing-2xs);
	font-weight: var(--font-weight-normal);
	font-size: var(--font-size-2xs);
	overflow: hidden;
	word-break: break-word;
}

.toggle {
	display: flex;
	position: absolute;
	padding: var(--spacing-2xs);
	left: 0;
	top: 5px;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	user-select: none;
	font-weight: normal;
	font-size: var(--font-size-s);
	overflow: hidden;

	svg {
		transition: all 0.3s $ease-out-expo;
	}
}
</style>
