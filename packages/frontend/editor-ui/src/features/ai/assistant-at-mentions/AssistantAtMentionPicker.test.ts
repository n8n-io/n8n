import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AssistantAtMentionPicker from './AssistantAtMentionPicker.vue';
import type { AssistantMentionSelection } from './assistantAtMentions.types';

const renderComponent = createComponentRenderer(AssistantAtMentionPicker);

describe('AssistantAtMentionPicker', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('renders artifact browse roots and emits a workflow selection', async () => {
		const input = document.createElement('textarea');
		const reference = document.createElement('div');
		document.body.append(input, reference);
		const { findByText, emitted } = renderComponent({
			props: {
				modelValue: true,
				query: '',
				projectId: undefined,
				artifacts: [{ id: 'w1', name: 'Orders' }],
				inputElement: input,
				reference,
			},
		});

		await userEvent.click(await findByText('Orders'));

		const selection = (emitted().select as unknown[][] | undefined)?.[0]?.[0] as
			| AssistantMentionSelection
			| undefined;
		expect(selection).toMatchObject({
			item: { kind: 'workflow', workflowId: 'w1', label: 'Orders' },
			attachment: { type: 'workflow', id: 'w1', name: 'Orders' },
		});
	});

	it('emits open state from the mention button', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: false, query: '' },
		});

		await userEvent.click(getByTestId('instance-ai-mention-button'));
		expect(emitted()['update:modelValue']?.[0]).toEqual([true]);
	});
});
