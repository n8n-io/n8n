import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import { N8nAlertDialog } from '@n8n/design-system/components/N8nAlertDialog';
import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';

const meta = {
	title: 'Components/N8nAlertDialog',
	component: N8nAlertDialog,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['small', 'medium'],
		},
		actionVariant: {
			control: { type: 'select' },
			options: ['solid', 'destructive'],
		},
	},
} satisfies Meta<typeof N8nAlertDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Basic = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		setup() {
			const handleConfirm = () => {
				console.log('Confirmed!');
			};
			return { handleConfirm };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				title="Save changes?"
				description="Your changes will be saved to the server."
				action-label="Save"
				@action="handleConfirm"
			>
				<template #trigger>
					<N8nButton label="Save" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {
		title: 'Save changes?',
	},
} satisfies Story;

export const Destructive = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		setup() {
			const handleDelete = () => {
				console.log('Deleted!');
			};
			return { handleDelete };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				title="Delete item?"
				description="This action cannot be undone. This will permanently delete the item."
				action-label="Delete"
				action-variant="destructive"
				@action="handleDelete"
			>
				<template #trigger>
					<N8nButton label="Delete" variant="danger" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {
		title: 'Delete item?',
	},
} satisfies Story;

export const WithLoading = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		setup() {
			const loading = ref(false);
			const isOpen = ref(false);

			const handleAction = async () => {
				loading.value = true;
				await new Promise((resolve) => setTimeout(resolve, 2000));
				loading.value = false;
				isOpen.value = false;
			};

			return { loading, isOpen, handleAction };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				v-model:open="isOpen"
				title="Process data?"
				description="This operation may take a few seconds."
				action-label="Process"
				:loading="loading"
				@action="handleAction"
			>
				<template #trigger>
					<N8nButton label="Start Process" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {
		title: 'Process data?',
	},
} satisfies Story;

export const Sizes = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		template: `
		<div style="display: flex; gap: 16px; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				title="Small Dialog"
				description="This is a small alert dialog."
				size="small"
			>
				<template #trigger>
					<N8nButton label="Small" variant="outline" />
				</template>
			</N8nAlertDialog>

			<N8nAlertDialog
				title="Medium Dialog"
				description="This is a medium alert dialog with more space for content."
				size="medium"
			>
				<template #trigger>
					<N8nButton label="Medium" variant="outline" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {
		title: 'Small Dialog',
	},
} satisfies Story;
