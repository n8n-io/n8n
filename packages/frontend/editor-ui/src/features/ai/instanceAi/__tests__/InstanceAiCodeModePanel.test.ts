import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiCodeModePanel from '../components/InstanceAiCodeModePanel.vue';
import InstanceAiProjectHome from '../components/InstanceAiProjectHome.vue';

const renderPanel = createComponentRenderer(InstanceAiCodeModePanel);
const renderHome = createComponentRenderer(InstanceAiProjectHome);

describe('InstanceAiCodeModePanel', () => {
	it('opens on the website preview', () => {
		const { getByTestId } = renderPanel();

		expect(getByTestId('instance-ai-code-mode')).toHaveTextContent('Code mode');
		expect(getByTestId('instance-ai-code-mode')).toHaveTextContent('site/draft');
		expect(getByTestId('instance-ai-code-mode-frame')).toBeTruthy();
	});

	it('shows the starter page source', async () => {
		const user = userEvent.setup();
		const { getByTestId, queryByTestId } = renderPanel();

		await user.click(getByTestId('instance-ai-code-mode-code'));

		expect(queryByTestId('instance-ai-code-mode-frame')).toBeNull();
		expect(getByTestId('instance-ai-code-mode-source')).toHaveTextContent('Your website');
		expect(getByTestId('instance-ai-code-mode-source')).toHaveTextContent('<!DOCTYPE html>');
	});

	it('asks before marking the draft to publish', async () => {
		const user = userEvent.setup();
		const { getByTestId, queryByText } = renderPanel();

		await user.click(getByTestId('instance-ai-code-mode-promote'));

		expect(getByTestId('instance-ai-code-mode')).toHaveTextContent(
			'The site can become a workflow in this project, or it can stay in this chat.',
		);

		await user.click(getByTestId('instance-ai-code-mode-publish'));

		expect(getByTestId('instance-ai-code-mode')).toHaveTextContent(
			'Marked to publish. The page stays in this chat until a workflow build runs.',
		);
		expect(queryByText('Promote to workflow')).toBeNull();
	});

	it('closes from the header', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderPanel();

		await user.click(getByTestId('instance-ai-code-mode-close'));

		expect(emitted().close).toEqual([[]]);
	});
});

describe('InstanceAiProjectHome', () => {
	it('shows the project inventory and the website action', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderHome();

		expect(getByTestId('instance-ai-project-home')).toHaveTextContent('Project home');
		expect(getByTestId('instance-ai-project-home')).toHaveTextContent(
			'Workflows, agents, and approvals in this project.',
		);
		expect(getByTestId('instance-ai-project-home')).toHaveTextContent('Agents');
		expect(getByTestId('instance-ai-project-home')).toHaveTextContent('Approvals');
		expect(getByTestId('instance-ai-project-home')).toHaveTextContent('People');

		await user.click(getByTestId('instance-ai-build-website'));

		expect(emitted()['build-website']).toEqual([[]]);
	});
});
