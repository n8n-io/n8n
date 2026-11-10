// Helpers for the Storybook stories of the skill review prototypes.
import { waitFor } from 'storybook/test';

// The dialogs render in a portal and use `data-test-id`, so the play functions query the
// document, not the story canvas.

export async function findByTestId(id: string, root: ParentNode = document): Promise<HTMLElement> {
	return await waitFor(
		() => {
			const element = root.querySelector<HTMLElement>(`[data-test-id="${id}"]`);
			if (!element) throw new Error(`No element with data-test-id "${id}"`);
			return element;
		},
		{ timeout: 5000 },
	);
}
