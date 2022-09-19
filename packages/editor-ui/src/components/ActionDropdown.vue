<template>
	<div :class="['action-dropdown-container', $style.actionDropdownContainer]">
		<el-dropdown :placement="placement" :trigger="trigger" @command="onSelect">
			<div :class="$style.activator">
				<n8n-icon :icon="activatorIcon"/>
			</div>
			<el-dropdown-menu slot="dropdown" :class="$style.userActionsMenu">
				<el-dropdown-item
					v-for="item in items"
					:key="item.id"
					:command="item.id"
					:disabled="item.disabled"
					:divided="item.divided"
				>
					<div :class="{
						[$style.itemContainer]: true,
						[$style.hasCustomStyling]: item.customClass !== undefined,
						[$style[item.customClass]]: item.customClass !== undefined,
					}">
						<span v-if="item.icon" :class="$style.icon">
							<font-awesome-icon :icon="item.icon"/>
						</span>
						<span :class="$style.label">
							{{ item.label }}
						</span>
					</div>
				</el-dropdown-item>
			</el-dropdown-menu>
		</el-dropdown>
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { IActionDropdownItem } from "@/Interface";

export default Vue.extend({
	name: 'ActionDropDown',
	props: {
		items: {
			type: Array as PropType<IActionDropdownItem[]>,
			required: true,
		},
		placement: {
			type: String,
			default: 'bottom',
			validator: (value: string): boolean =>
				['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start'].includes(value),
		},
		activatorIcon: {
			type: String,
			default: 'ellipsis-v',
		},
		trigger: {
			type: String,
			default: 'click',
			validator: (value: string): boolean =>
				['click', 'hover'].includes(value),
		},
	},
	methods: {
		onSelect(action: string) : void {
			this.$emit('select', action);
		},
	},
});

</script>

<style lang="scss" module>

.activator {
	width: 2em;
	cursor: pointer;
	padding: var(--spacing-2xs);
	border-radius: var(--border-radius-base);
	line-height: normal !important;

	svg {
		position: static !important;
	}

	&:hover {
		background-color: var(--color-background-base);
		color: initial !important;
	}
}

.itemContainer {
	display: flex;
}

.icon {
	text-align: center;
	margin-right: var(--spacing-2xs);

	svg { width: 1.2em !important; }
}

:global(li.is-disabled) {
	.hasCustomStyling {
		color: inherit !important;
	}
}

.deleteItem {
	color: var(--color-danger);
}

</style>
