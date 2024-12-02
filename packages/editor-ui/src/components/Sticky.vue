<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { StyleValue } from 'vue';
import { onClickOutside } from '@vueuse/core';
import type { Workflow } from 'n8n-workflow';

import { isNumber, isString } from '@/utils/typeGuards';
import type { INodeUi, XYPosition } from '@/Interface';

import { QUICKSTART_NOTE_NAME } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useContextMenu } from '@/composables/useContextMenu';
import { useDeviceSupport } from 'n8n-design-system';
import { GRID_SIZE } from '@/utils/nodeViewUtils';
import { useToast } from '@/composables/useToast';
import { assert } from '@/utils/assert';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import { useNodeBase } from '@/composables/useNodeBase';
import { useTelemetry } from '@/composables/useTelemetry';
import { useStyles } from '@/composables/useStyles';
import { useI18n } from '@/composables/useI18n';

const props = withDefaults(
	defineProps<{
		nodeViewScale?: number;
		gridSize?: number;
		name: string;
		instance: BrowserJsPlumbInstance;
		isReadOnly?: boolean;
		isActive?: boolean;
		hideActions?: boolean;
		disableSelecting?: boolean;
		showCustomTooltip?: boolean;
		workflow: Workflow;
	}>(),
	{
		nodeViewScale: 1,
		gridSize: GRID_SIZE,
	},
);

defineOptions({ name: 'Sticky' });

const emit = defineEmits<{
	removeNode: [string];
	nodeSelected: [string, boolean, boolean];
}>();

const deviceSupport = useDeviceSupport();
const telemetry = useTelemetry();
const toast = useToast();
const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const { APP_Z_INDEXES } = useStyles();
const i18n = useI18n();

const isResizing = ref<boolean>(false);
const isTouchActive = ref<boolean>(false);
const forceActions = ref(false);
const isColorPopoverVisible = ref(false);
const stickOptions = ref<HTMLElement>();
const isEditing = ref(false);

const setForceActions = (value: boolean) => {
	forceActions.value = value;
};

const setColorPopoverVisible = (value: boolean) => {
	isColorPopoverVisible.value = value;
};

const contextMenu = useContextMenu((action) => {
	if (action === 'change_color') {
		setForceActions(true);
		setColorPopoverVisible(true);
	}
});

const nodeBase = useNodeBase({
	name: props.name,
	instance: props.instance,
	workflowObject: props.workflow,
	isReadOnly: props.isReadOnly,
	emit: emit as (event: string, ...args: unknown[]) => void,
});

onClickOutside(stickOptions, () => setColorPopoverVisible(false));

defineExpose({
	deviceSupport,
	toast,
	contextMenu,
	forceActions,
	...nodeBase,
	setForceActions,
	isColorPopoverVisible,
	setColorPopoverVisible,
	stickOptions,
});

const data = computed(() => workflowsStore.getNodeByName(props.name));
// TODO: remove either node or data
const node = computed(() => workflowsStore.getNodeByName(props.name));
const nodeId = computed(() => data.value?.id);
const nodeType = computed(() => {
	return data.value && nodeTypesStore.getNodeType(data.value.type, data.value.typeVersion);
});
const defaultText = computed(() => {
	if (!nodeType.value) {
		return '';
	}
	const properties = nodeType.value.properties;
	const content = properties.find((property) => property.name === 'content');
	return content && isString(content.default) ? content.default : '';
});
const isSelected = computed(
	() =>
		uiStore.getSelectedNodes.find(({ name }: INodeUi) => name === data.value?.name) !== undefined,
);

const position = computed<XYPosition>(() => (node.value ? node.value.position : [0, 0]));

const height = computed(() =>
	node.value && isNumber(node.value.parameters.height) ? node.value.parameters.height : 0,
);

const width = computed(() =>
	node.value && isNumber(node.value.parameters.width) ? node.value.parameters.width : 0,
);

const stickySize = computed<StyleValue>(() => ({
	height: height.value + 'px',
	width: width.value + 'px',
}));

const stickyPosition = computed<StyleValue>(() => ({
	left: position.value[0] + 'px',
	top: position.value[1] + 'px',
	zIndex: props.isActive
		? APP_Z_INDEXES.ACTIVE_STICKY
		: -1 * Math.floor((height.value * width.value) / 1000),
}));

const workflowRunning = computed(() => uiStore.isActionActive.workflowRunning);

const showActions = computed(
	() =>
		!(
			props.hideActions ||
			isEditing.value ||
			props.isReadOnly ||
			workflowRunning.value ||
			isResizing.value
		) || forceActions.value,
);

onMounted(() => {
	// Initialize the node
	if (data.value !== null) {
		try {
			nodeBase.addNode(data.value);
		} catch (error) {
			// This breaks when new nodes are loaded into store but workflow tab is not currently active
			// Shouldn't affect anything
		}
	}
});

const onShowPopover = () => setForceActions(true);
const onHidePopover = () => setForceActions(false);
const deleteNode = async () => {
	assert(data.value);
	// Wait a tick else vue causes problems because the data is gone
	await nextTick();

	emit('removeNode', data.value.name);
};

const changeColor = (index: number) => {
	workflowsStore.updateNodeProperties({
		name: props.name,
		properties: {
			parameters: {
				...node.value?.parameters,
				color: index,
			},
			position: node.value?.position ?? [0, 0],
		},
	});
};

const onEdit = (edit: boolean) => {
	isEditing.value = edit;
	if (edit && !props.isActive && node.value) {
		ndvStore.activeNodeName = node.value.name;
	} else if (props.isActive && !edit) {
		ndvStore.activeNodeName = null;
	}
};

const onMarkdownClick = (link: HTMLAnchorElement) => {
	if (link) {
		const isOnboardingNote = props.name === QUICKSTART_NOTE_NAME;
		const isWelcomeVideo = link.querySelector('img[alt="n8n quickstart video"]');
		const type =
			isOnboardingNote && isWelcomeVideo
				? 'welcome_video'
				: isOnboardingNote && link.getAttribute('href') === '/templates'
					? 'templates'
					: 'other';

		telemetry.track('User clicked note link', { type });
	}
};

const setParameters = (params: {
	content?: string;
	height?: number;
	width?: number;
	color?: string;
}) => {
	if (node.value) {
		const nodeParameters = {
			content: isString(params.content) ? params.content : node.value.parameters.content,
			height: isNumber(params.height) ? params.height : node.value.parameters.height,
			width: isNumber(params.width) ? params.width : node.value.parameters.width,
			color: isString(params.color) ? params.color : node.value.parameters.color,
		};

		workflowsStore.setNodeParameters({
			key: node.value.id,
			name: node.value.name,
			value: nodeParameters,
		});
	}
};

const onInputChange = (content: string) => {
	if (!node.value) {
		return;
	}
	node.value.parameters.content = content;
	setParameters({ content });
};

const setPosition = (newPosition: XYPosition) => {
	if (!node.value) return;

	workflowsStore.updateNodeProperties({
		name: node.value.name,
		properties: { position: newPosition },
	});
};

const onResizeStart = () => {
	isResizing.value = true;
	if (!isSelected.value && node.value) {
		emit('nodeSelected', node.value.name, false, true);
	}
};

const onResize = ({
	height,
	width,
	dX,
	dY,
}: {
	width: number;
	height: number;
	dX: number;
	dY: number;
}) => {
	if (!node.value) {
		return;
	}
	if (dX !== 0 || dY !== 0) {
		setPosition([node.value.position[0] + (dX || 0), node.value.position[1] + (dY || 0)]);
	}

	setParameters({ height, width });
};

const onResizeEnd = () => {
	isResizing.value = false;
};

const touchStart = () => {
	if (deviceSupport.isTouchDevice && !deviceSupport.isMacOs && !isTouchActive.value) {
		isTouchActive.value = true;
		setTimeout(() => {
			isTouchActive.value = false;
		}, 2000);
	}
};

const onContextMenu = (e: MouseEvent): void => {
	if (node.value && !props.isActive) {
		contextMenu.open(e, { source: 'node-right-click', nodeId: node.value.id });
	} else {
		e.stopPropagation();
	}
};
</script>

<template>
	<div
		:id="nodeId"
		:ref="data?.name"
		class="sticky-wrapper"
		:style="stickyPosition"
		:data-name="data?.name"
		data-test-id="sticky"
	>
		<div
			:class="{
				'sticky-default': true,
				'touch-active': isTouchActive,
				'is-touch-device': deviceSupport.isTouchDevice,
				'is-read-only': isReadOnly,
			}"
			:style="stickySize"
		>
			<div v-show="isSelected" class="select-sticky-background" />
			<div
				v-touch:start="touchStart"
				v-touch:end="nodeBase.touchEnd"
				class="sticky-box"
				@click.left="nodeBase.mouseLeftClick"
				@contextmenu="onContextMenu"
			>
				<N8nResizeableSticky
					v-if="node"
					:id="node.id"
					:model-value="node.parameters.content"
					:height="node.parameters.height"
					:width="node.parameters.width"
					:scale="nodeViewScale"
					:background-color="node.parameters.color"
					:read-only="isReadOnly"
					:default-text="defaultText"
					:edit-mode="isActive && !isReadOnly"
					:grid-size="gridSize"
					@edit="onEdit"
					@resizestart="onResizeStart"
					@resize="onResize"
					@resizeend="onResizeEnd"
					@markdown-click="onMarkdownClick"
					@update:model-value="onInputChange"
				/>
			</div>

			<div
				v-show="showActions"
				ref="stickOptions"
				:class="{ 'sticky-options': true, 'no-select-on-click': true, 'force-show': forceActions }"
			>
				<div
					v-touch:tap="deleteNode"
					class="option"
					data-test-id="delete-sticky"
					:title="i18n.baseText('node.delete')"
				>
					<font-awesome-icon icon="trash" />
				</div>
				<n8n-popover
					effect="dark"
					trigger="click"
					placement="top"
					:popper-style="{ width: '208px' }"
					:visible="isColorPopoverVisible"
					@show="onShowPopover"
					@hide="onHidePopover"
				>
					<template #reference>
						<div
							class="option"
							data-test-id="change-sticky-color"
							:title="i18n.baseText('node.changeColor')"
							@click="() => setColorPopoverVisible(!isColorPopoverVisible)"
						>
							<font-awesome-icon icon="palette" />
						</div>
					</template>
					<div class="content">
						<div
							v-for="(_, index) in Array.from({ length: 7 })"
							:key="index"
							class="color"
							data-test-id="color"
							:class="`sticky-color-${index + 1}`"
							:style="{
								'border-width': '1px',
								'border-style': 'solid',
								'border-color': 'var(--color-foreground-xdark)',
								'background-color': `var(--color-sticky-background-${index + 1})`,
								'box-shadow':
									(index === 0 && node?.parameters.color === '') ||
									index + 1 === node?.parameters.color
										? `0 0 0 1px var(--color-sticky-background-${index + 1})`
										: 'none',
							}"
							@click="changeColor(index + 1)"
						></div>
					</div>
				</n8n-popover>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.sticky-wrapper {
	position: absolute;

	.sticky-default {
		.sticky-box {
			width: 100%;
			height: 100%;
		}

		&.touch-active,
		&:hover {
			.sticky-options {
				display: flex;
				cursor: pointer;
			}
		}

		&.is-read-only {
			pointer-events: none;
		}

		.sticky-options {
			display: none;
			justify-content: flex-start;
			position: absolute;
			top: -25px;
			left: -8px;
			height: 26px;
			font-size: 0.9em;
			text-align: left;
			z-index: 10;
			color: #aaa;
			text-align: center;

			.option {
				width: 28px;
				display: inline-block;

				&.touch {
					display: none;
				}

				&:hover {
					color: $color-primary;
				}
			}
		}

		.force-show {
			display: flex;
		}

		&.is-touch-device .sticky-options {
			left: -25px;
			width: 150px;

			.option.touch {
				display: initial;
			}
		}
	}
}

.select-sticky-background {
	display: block;
	position: absolute;
	background-color: var(--color-canvas-selected);
	border-radius: var(--border-radius-xlarge);
	overflow: hidden;
	height: calc(100% + 16px);
	width: calc(100% + 16px);
	left: -8px;
	top: -8px;
	z-index: 0;
}

.content {
	display: flex;
	flex-direction: row;
	width: fit-content;
	gap: var(--spacing-2xs);
}

.color {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	border-color: var(--color-primary-shade-1);

	&:hover {
		cursor: pointer;
	}
}
</style>
