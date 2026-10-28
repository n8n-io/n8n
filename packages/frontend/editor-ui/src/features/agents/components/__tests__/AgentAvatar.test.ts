import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';

import AgentAvatar, { type AgentAvatarKind } from '../AgentAvatar.vue';

const renderComponent = createComponentRenderer(AgentAvatar);

describe('AgentAvatar', () => {
	it.each<[AgentAvatarKind, string]>([
		['pass', 'Passed'],
		['strong', 'Passed'],
		['work', 'Needs work'],
		['fail', "Couldn't finish"],
		['idle', 'Not run'],
		['waiting', 'Not run'],
	])('labels kind "%s" as "%s"', (kind, label) => {
		const { getByRole } = renderComponent({ props: { kind, size: 'sm' } });

		const avatar = getByRole('img');
		expect(avatar).toHaveAttribute('aria-label', label);
		expect(avatar).toHaveAttribute('title', label);
	});

	it('folds the scenario tag into the accessible label, ahead of the status text', () => {
		const { getByRole } = renderComponent({ props: { kind: 'fail', size: 'sm', label: 'Vague' } });

		const avatar = getByRole('img');
		expect(avatar).toHaveAttribute('aria-label', "Vague — Couldn't finish");
		expect(avatar).toHaveAttribute('title', "Vague — Couldn't finish");
	});

	it('marks the waiting state for motion styling', () => {
		const { getByRole } = renderComponent({ props: { kind: 'waiting', size: 'sm' } });

		expect(getByRole('img')).toHaveAttribute('data-waiting', '');
	});

	it('does not mark non-waiting states for motion styling', () => {
		const { getByRole } = renderComponent({ props: { kind: 'idle', size: 'sm' } });

		expect(getByRole('img')).not.toHaveAttribute('data-waiting');
	});
});
