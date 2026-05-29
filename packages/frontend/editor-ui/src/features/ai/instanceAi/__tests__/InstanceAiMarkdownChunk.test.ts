import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiMarkdownChunk from '../components/InstanceAiMarkdownChunk.vue';

const renderComponent = createComponentRenderer(InstanceAiMarkdownChunk);

describe('InstanceAiMarkdownChunk', () => {
	it('renders artifact command labels through i18n', async () => {
		const { getByRole, rerender } = renderComponent({
			props: {
				source: {
					type: 'artifact-create',
					content: '',
					command: { title: 'Workflow audit', type: 'md', content: '# Audit' },
					isIncomplete: false,
				},
			},
		});

		expect(getByRole('button')).toHaveTextContent('Created');
		expect(getByRole('button')).toHaveTextContent('Workflow audit');

		await rerender({
			source: {
				type: 'artifact-edit',
				content: '',
				command: {
					title: 'Workflow audit',
					oldString: 'old',
					newString: 'new',
					replaceAll: false,
				},
				isIncomplete: false,
			},
		});

		expect(getByRole('button')).toHaveTextContent('Updated');
		expect(getByRole('button')).toHaveTextContent('Workflow audit');
	});
});
