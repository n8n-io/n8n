<template>
	<div class="search-container">
		<div :class="{ prefix: true, active: value.length > 0 }">
			<font-awesome-icon icon="search" />
		</div>
		<div class="text">
			<input
				:placeholder="$locale.baseText('nodeCreator.searchBar.searchNodes')"
				ref="input"
				:value="value"
				@input="onInput"
			/>
		</div>
		<div class="suffix" v-if="value.length > 0" @click="clear">
			<span class="clear el-icon-close clickable"></span>
		</div>
	</div>
</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';

import { externalHooks } from '@/components/mixins/externalHooks';

export default mixins(externalHooks).extend({
	name: "SearchBar",
	props: ["value", "eventBus"],
	mounted() {
		if (this.$props.eventBus) {
			this.$props.eventBus.$on("focus", () => {
				this.focus();
			});
		}
		setTimeout(() => {
			this.focus();
		}, 0);

		this.$externalHooks().run('nodeCreator_searchBar.mount', { inputRef: this.$refs['input'] });
	},
	methods: {
		focus() {
			const input = this.$refs.input as HTMLInputElement;
			if (input) {
				input.focus();
			}
		},
		onInput(event: InputEvent) {
			const input = event.target as HTMLInputElement;
			this.$emit("input", input.value);
		},
		clear() {
			this.$emit("input", "");
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
	border-top: 1px solid $--node-creator-border-color;
	border-bottom: 1px solid $--node-creator-border-color;
	background-color: $--node-creator-search-background-color;
	color: $--node-creator-search-placeholder-color;
}

.prefix {
	text-align: center;
	font-size: 16px;
	margin-right: 14px;

	&.active {
		color: $--color-primary !important;
	}
}

.text {
	flex-grow: 1;

	input {
		width: 100%;
		border: none !important;
		outline: none;
		font-size: 18px;
		-webkit-appearance: none;
		background-color: var(--color-background-xlight);
		color: var(--color-text-dark);

		&::placeholder,
		&::-webkit-input-placeholder {
			color: $--node-creator-search-placeholder-color;
		}
	}
}

.suffix {
	min-width: 20px;
	text-align: center;
	display: inline-block;
}

.clear {
	background-color: $--node-creator-search-clear-background-color;
	border-radius: 50%;
	height: 16px;
	width: 16px;
	font-size: 16px;
	color: $--node-creator-search-background-color;
	display: inline-flex;
	align-items: center;

	&:hover {
		background-color: $--node-creator-search-clear-background-color-hover;
	}

	&:before {
		line-height: 16px;
		display: flex;
		height: 16px;
		width: 16px;
		font-size: 15px;
		align-items: center;
		justify-content: center;
	}
}
</style>
