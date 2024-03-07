import { createComponentRenderer } from '@/__tests__/render';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';

const renderComponent = createComponentRenderer(ProjectSharing);

describe('ProjectSharing', () => {
	it('should render empty select when projects is empty', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				projects: [],
				modelValue: [],
			},
		});

		expect(getByTestId('project-sharing-select')).toBeInTheDocument();
		expect(queryByTestId('project-sharing-list-item')).not.toBeInTheDocument();
	});
});
