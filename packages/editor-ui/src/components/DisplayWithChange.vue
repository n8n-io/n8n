<template>
	<span class="static-text">{{currentValue}}</span>
</template>

<script lang="ts">

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { INodeUi } from '@/Interface';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'DisplayWithChange',
	props: {
		keyName: String,
	},
	computed: {
		node (): INodeUi {
			return this.$store.getters.activeNode;
		},
		currentValue (): string {
			const getDescendantProp = (obj: object, path: string): string => {
				// @ts-ignore
				return path.split('.').reduce((acc, part) => acc && acc[part], obj);
			};

			if (this.keyName === 'name' && this.node.type.startsWith('n8n-nodes-base.')) {
				const shortNodeType = this.$locale.shortNodeType(this.node.type);

				return this.$locale.headerText({
					key: `headers.${shortNodeType}.displayName`,
					fallback: getDescendantProp(this.node, this.keyName),
				});
			}

			return getDescendantProp(this.node, this.keyName);
		},
	},
	watch: {
		currentValue (val) {
			// Deactivate when the data to edit changes
			// (like when a different node gets selected)
			this.editActive = false;
		},
	},
	data: () => {
		return {
			editActive: false,
			newValue: '',
		};
	},
	methods: {
		noOp () {},
		startEdit () {
			if (this.isReadOnly === true) {
				return;
			}
			this.editActive = true;
			this.newValue = this.currentValue;

			setTimeout(() => {
				(this.$refs.inputField as HTMLInputElement).focus();
			});
		},
		cancelEdit () {
			this.editActive = false;
		},
		setValue () {
			const sendData = {
				value: this.newValue,
				name: this.keyName,
			};

			this.$emit('valueChanged', sendData);
			this.editActive = false;
		},
	},
});
</script>

<style lang="scss">

.static-text-wrapper {
	line-height: 1.4em;
	font-weight: 600;

	.static-text {
		position: relative;
		top: 1px;

		&:hover {
			border-bottom: 1px dashed #555;
			cursor: text;
		}
	}

	input {
		font-weight: 600;

		&.edit-field {
			background: none;
			border: none;
			font-size: 1em;
			color: #555;
			border-bottom: 1px dashed #555;
			width: calc(100% - 130px);
		}
		&.edit-field:focus {
			outline-offset: unset;
			outline: none;
		}
	}

	.icons {
		margin-left: 0.6em;
	}
}

</style>
