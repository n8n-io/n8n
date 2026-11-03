import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockNodeTypeDescription } from '@/__tests__/mocks';
import ToolListItem from './ToolListItem.vue';

vi.mock('@/features/shared/nodeCreator/nodeCreator.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/shared/nodeCreator/nodeCreator.utils')>()),
	getNodeItemRestriction: () => undefined,
}));

describe('ToolListItem', () => {
	it('keeps the install explanation visible without opening the tooltip', async () => {
		const { getByTestId, emitted } = createComponentRenderer(ToolListItem)({
			pinia: createTestingPinia(),
			props: {
				nodeType: mockNodeTypeDescription(),
				mode: 'available',
				communityPreview: true,
				installDisabled: true,
			},
		});
		const button = getByTestId('chat-tool-install-button');
		expect(button).toHaveAttribute('aria-disabled', 'true');
		expect(button).not.toBeDisabled();
		expect(button).toHaveAccessibleDescription(
			'Please contact an administrator to install this community node:',
		);
		expect(document.getElementById(button.getAttribute('aria-describedby')!)).toBeVisible();
		await userEvent.click(button);
		expect(emitted('add')).toBeUndefined();
	});
});
