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
			const isOpen = ref(false);
			const handleConfirm = () => {
				console.log('Confirmed!');
				isOpen.value = false;
			};
			return { isOpen, handleConfirm };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nButton label="Save" @click="isOpen = true" />
			<N8nAlertDialog
				v-model:open="isOpen"
				title="Save changes?"
				description="Your changes will be saved to the server."
				action-label="Save"
				@action="handleConfirm"
			/>
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
			const isOpen = ref(false);
			const handleDelete = () => {
				console.log('Deleted!');
				isOpen.value = false;
			};
			return { isOpen, handleDelete };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nButton label="Delete" variant="danger" @click="isOpen = true" />
			<N8nAlertDialog
				v-model:open="isOpen"
				title="Delete item?"
				description="This action cannot be undone. This will permanently delete the item."
				action-label="Delete"
				action-variant="destructive"
				@action="handleDelete"
			/>
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
			<N8nButton label="Start Process" @click="isOpen = true" />
			<N8nAlertDialog
				v-model:open="isOpen"
				title="Process data?"
				description="This operation may take a few seconds."
				action-label="Process"
				:loading="loading"
				@action="handleAction"
			/>
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
		setup() {
			const isSmallOpen = ref(false);
			const isMediumOpen = ref(false);
			return { isSmallOpen, isMediumOpen };
		},
		template: `
		<div style="display: flex; gap: 16px; justify-content: center; padding: 40px;">
			<N8nButton label="Small" variant="outline" @click="isSmallOpen = true" />
			<N8nAlertDialog
				v-model:open="isSmallOpen"
				title="Small Dialog"
				description="This is a small alert dialog."
				size="small"
			/>

			<N8nButton label="Medium" variant="outline" @click="isMediumOpen = true" />
			<N8nAlertDialog
				v-model:open="isMediumOpen"
				title="Medium Dialog"
				description="This is a medium alert dialog with more space for content."
				size="medium"
			/>
		</div>
		`,
	}),
	args: {
		title: 'Small Dialog',
	},
} satisfies Story;
