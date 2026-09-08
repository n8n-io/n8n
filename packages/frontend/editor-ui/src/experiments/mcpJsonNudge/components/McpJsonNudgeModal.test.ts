import { createComponentRenderer } from '@/__tests__/render';
import { defineComponent } from 'vue';
import McpJsonNudgeModal from './McpJsonNudgeModal.vue';

const ModalStub = defineComponent({
	props: ['name', 'title'],
	template: `
		<div :data-test-id="name">
			<h1>{{ title }}</h1>
			<slot name="content" />
		</div>
	`,
});

const renderComponent = createComponentRenderer(McpJsonNudgeModal, {
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('McpJsonNudgeModal', () => {
	it.each([
		['export', 'Exporting this for an AI tool?'],
		['import_file', 'Importing this from an AI tool?'],
		['import_url', 'Importing this from an AI tool?'],
	] as const)('shows the right header for the %s surface', (surface, expectedTitle) => {
		const { getByText } = renderComponent({ props: { data: { surface } } });

		expect(getByText(expectedTitle)).toBeInTheDocument();
	});
});
