<template>
	<div>
		<el-drawer
			v-if="drawer"
			:direction="drawerDirection"
			:visible="visible && visibleDrawer"
			:size="drawerWidth"
			:before-close="closeDrawer"
			>
			<template v-slot:title>
				<slot name="header" />
			</template>
			<template>
				<slot name="content"/>
			</template>
		</el-drawer>
		<el-dialog
			v-else
			:visible="dialogVisible"
			:before-close="closeDialog"
			:title="title"
			:class="{ 'dialog-wrapper': true, [size]: true }"
			:width="width"
			append-to-body
		>
			<template v-slot:title>
				<slot name="header" />
			</template>
			<div class="modal-content" @keydown.stop @keydown.enter="handleEnter" @keydown.esc="closeDialog">
				<slot name="content"/>
			</div>
			<el-row class="modal-footer">
				<slot name="footer" :close="closeDialog" />
			</el-row>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

const sizeMap: {[size: string]: string} = {
	xl: '80%',
	m: '50%',
	default: '50%',
};

export default Vue.extend({
	name: "Modal",
	props: ['name', 'title', 'eventBus', 'size', 'drawer', 'drawerDirection', 'drawerWidth', 'visible'],
	data() {
		return {
			visibleDrawer: this.drawer,
		};
	},
	mounted() {
		window.addEventListener('keydown', this.onWindowKeydown);

		if (this.$props.eventBus) {
			this.$props.eventBus.$on('close', () => {
				this.closeDialog();
			});
		}

		const activeElement = document.activeElement as HTMLElement;
		if (activeElement) {
			activeElement.blur();
		}
	},
	beforeDestroy() {
		window.removeEventListener('keydown', this.onWindowKeydown);
	},
	methods: {
		onWindowKeydown(event: KeyboardEvent) {
			if (!this.isActive) {
				return;
			}

			if (event && event.keyCode === 13) {
				this.handleEnter();
			}
		},
		handleEnter() {
			if (this.isActive) {
				this.$emit('enter');
			}
		},
		closeDialog(callback?: () => void) {
			this.$store.commit('ui/closeTopModal');
			if (callback) {
				callback();
			}
		},
		closeDrawer() {
			this.visibleDrawer = false;
			setTimeout(() =>{
				this.$store.commit('ui/closeTopModal');
				this.visibleDrawer = true;
			}, 300); // delayed for closing animation to take effect
		},
	},
	computed: {
		width(): string {
			return this.$props.size ? sizeMap[this.$props.size] : sizeMap.default;
		},
		isActive(): boolean {
			return this.$store.getters['ui/isModalActive'](this.$props.name);
		},
		dialogVisible(): boolean {
			return this.$store.getters['ui/isModalOpen'](this.$props.name);
		},
	},
});
</script>

<style lang="scss">
.el-drawer__header {
	margin: 0;
	padding: 30px 30px 0 30px;
}

.el-drawer__body {
	overflow: hidden;
}

.dialog-wrapper {
	* {
		box-sizing: border-box;
	}

	&.xl > div, &.md > div {
		min-width: 620px;
	}

	&.sm {
		display: flex;
		align-items: center;
		justify-content: center;

		> div {
			max-width: 420px;
		}
	}
}

.modal-content > .el-row {
	margin-bottom: 15px;
}

.modal-footer > .el-button {
	float: right;
	margin-left: 5px;
}
</style>
