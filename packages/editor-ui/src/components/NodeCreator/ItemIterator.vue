<template>
	<div>
		<div
			:is="transitionsEnabled ? 'transition-group' : 'div'"
			name="accordion"
			@before-enter="beforeEnter"
			@enter="enter"
			@before-leave="beforeLeave"
			@leave="leave"
		>
			<div v-for="(item, index) in elements" :key="getKey(item)">
				<CreatorItem
					:item="item"
					:active="activeIndex === index && !disabled"
					:clickable="!disabled"
					:lastNode="
						index === elements.length - 1 || elements[index + 1].type !== 'node'
					"
					@click="() => selected(item)"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { INodeCreateElement } from "@/Interface";

import Vue from "vue";
import CreatorItem from "./CreatorItem.vue";

export default Vue.extend({
	name: "ItemIterator",
	components: {
		CreatorItem,
	},
	props: ["elements", "activeIndex", "disabled", "transitionsEnabled"],
	methods: {
		selected(element: INodeCreateElement) {
			if (this.$props.disabled) {
				return;
			}

			if (element.type === "node" && element.nodeType) {
				this.$emit("nodeTypeSelected", element.nodeType.name);
			} else if (element.type === "category") {
				this.$emit("categorySelected", element.category);
			} else if (element.type === "subcategory") {
				this.$emit("subcategorySelected", element);
			}
		},
		getKey(element: INodeCreateElement) {
			if (element.type === "category") {
				return element.category;
			}
			if (element.type === "subcategory") {
				return `${element.category}_${element.subcategory}`;
			}
			if (element.nodeType) {
				return `${element.category}_${element.nodeType.name}`;
			}

			return "";
		},
		beforeEnter(el: HTMLElement) {
			el.style.height = "0";
		},
		enter(el: HTMLElement) {
			el.style.height = el.scrollHeight + "px";
		},
		beforeLeave(el: HTMLElement) {
			el.style.height = el.scrollHeight + "px";
		},
		leave(el: HTMLElement) {
			el.style.height = "0";
		},
	},
});
</script>


<style lang="scss" scoped>
.accordion-enter {
	opacity: 0;
}

.accordion-leave-active {
	opacity: 1;
}

.accordion-enter-active,
.accordion-leave-active {
	transition: all 0.25s ease, opacity 0.25s ease;
}

.accordion-leave-to {
	opacity: 0;
}

.accordion-enter-to {
	opacity: 1;
}
</style>
