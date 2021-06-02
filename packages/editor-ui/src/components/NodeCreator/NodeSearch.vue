<template>
	<div class="search-container">
		<div :class="{prefix: true, active: value.length > 0}">
			<font-awesome-icon icon="search" />
		</div>
		<input
			placeholder="Search nodes..."
			ref="input"
			:value="value"
			@input="onInput"
		/>
		<div class="suffix" v-if="value.length > 0" @click="clear">
			<span class="close el-icon-close clickable"></span>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: 'NodeSeach',
	props: ['value', 'eventBus'],
	mounted() {
		if (this.$props.eventBus) {
			this.$props.eventBus.$on('focus', () => {
				this.focus();
			});
		}
		this.focus();
	},
	methods: {
		focus() {
			const input = this.$refs.input as HTMLInputElement;
			input.focus();
		},
		onInput(event: InputEvent) {
			const input = event.target as HTMLInputElement;
			this.$emit('input', input.value);
		},
		clear() {
			this.$emit('input', '');
		},
	},
});
</script>

<style lang="scss" scoped>
.search-container {
	display: flex;
	height: 60px;
	align-items: center;
	padding-left: 14px;
	padding-right: 20px;
	border: 1px solid $--node-creator-border-color;
	background-color: $--node-creator-search-background-color;
	color: $--node-creator-search-placeholder-color;

	&:hover {
		.suffix {
			visibility: visible;
		}
	}
}

.prefix {
	text-align: center;
	font-size: 16px;
	margin-right: 14px;

	&.active {
		color: $--color-primary !important;
	}
}

input, input:focus-visible {
	flex-grow: 1;
	border: none;
	outline: none;
	font-size: 18px;

	&::placeholder {
		color: #909399;
	}
}

.suffix {
	min-width: 20px;
	text-align: center;
	visibility: hidden;
	display: inline-block;
}

.close {
	background-color: #8D939C;
	border-radius: 50%;
	height: 16px;
	width: 16px;
	font-size: 16px;
	color: $--node-creator-search-background-color;
	display: inline-flex;
	align-items: center;

	&:hover {
		background-color: #3d3f46;
	}

	&:before {
		line-height: 16px;
		display: block;
	}
}
</style>