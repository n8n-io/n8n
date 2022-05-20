<template>
	<div>
		<div :class="$style.inputPanel" v-if="!isTriggerNode" :style="inputPanelStyles">
			<slot name="left"></slot>
		</div>
		<div :class="$style.outputPanel" :style="outputPanelStyles">
			<slot name="right"></slot>
		</div>
			<div :class="$style.mainPanel" :style="mainPanelStyles">
				<div :class="$style.dragButtonContainer" @click="close">
					<PanelDragButton
						:class="{ [$style.draggable]: true, [$style.visible]: isDragging }"
						v-if="!isTriggerNode"
						:isDragging="isDragging"
						:canMoveLeft="canMoveLeft"
						:canMoveRight="canMoveRight"
					/>
				</div>
				<slot name="main"></slot>
			</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'DraggablePanels',
	data() {
		return {
			dragStartPosition: 0,
		};
	},
	mounted() {
		this.setTotalWidth();
		this.$store.commit('ui/setNDVSessionId');
		window.addEventListener('resize', this.setTotalWidth);
	},
	destroyed() {
		window.removeEventListener('resize', this.setTotalWidth);
	},
});
</script>

<style lang="scss">
$--main-panel-width: 360px;

.dataPanel {
	position: absolute;
	height: calc(100% - 2 * var(--spacing-l));
	position: absolute;
	top: var(--spacing-l);
	z-index: 0;
}

.inputPanel {
	composes: dataPanel;
	left: var(--spacing-l);

	> * {
		border-radius: var(--border-radius-large) 0 0 var(--border-radius-large);
	}
}

.outputPanel {
	composes: dataPanel;
	right: var(--spacing-l);
	width: $--main-panel-width;

	> * {
		border-radius: 0 var(--border-radius-large) var(--border-radius-large) 0;
	}
}

.mainPanel {
	position: absolute;
	height: 100%;

	&:hover {
		.draggable {
			visibility: visible;
		}
	}
}

.draggable {
	position: absolute;
	left: 40%;
	visibility: hidden;
}

.dragButtonContainer {
	position: absolute;
	top: -12px;
	width: $--main-panel-width;
	height: 12px;

	&:hover .draggable {
		visibility: visible;
	}
}

.visible {
	visibility: visible;
}

</style>
