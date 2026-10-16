import type { SkillVersionSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import type { AgentSkill } from '../../types';
import SkillVersionCompare from './SkillVersionCompare.vue';

configure({ testIdAttribute: 'data-testid' });

vi.mock('v-code-diff', () => ({
	CodeDiff: {
		name: 'CodeDiff',
		props: ['oldString', 'newString'],
		template: '<div data-testid="code-diff" :data-old="oldString" :data-new="newString" />',
	},
}));

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage: vi.fn() }),
}));

const renderComponent = createComponentRenderer(SkillVersionCompare, {
	pinia: createTestingPinia(),
});

function summary(versionNumber: number, label: string | null = null): SkillVersionSummary {
	return {
		id: `id-${versionNumber}`,
		version: versionNumber,
		label,
		createdBy: null,
		createdAt: '2026-10-01T00:00:00.000Z',
	};
}

function content(instructions: string): AgentSkill {
	return { name: 'Refund policy', description: 'Refunds', instructions };
}

const CONTENTS: Record<number, AgentSkill> = {
	1: content('one'),
	2: content('one\ntwo'),
};

describe('SkillVersionCompare', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads both versions and shows their diff', async () => {
		const loadVersion = vi.fn(async (versionNumber: number) => CONTENTS[versionNumber]);
		const { findByTestId, getByTestId } = renderComponent({
			props: {
				versions: [summary(2), summary(1, 'First')],
				latestVersion: 2,
				loadVersion,
				from: 1,
				to: 2,
			},
		});

		expect(await findByTestId('skill-version-diff')).toBeVisible();
		expect(loadVersion).toHaveBeenCalledWith(1);
		expect(loadVersion).toHaveBeenCalledWith(2);
		expect(getByTestId('skill-version-diff-from')).toHaveTextContent('v1 · First');
		expect(getByTestId('skill-version-diff-to')).toHaveTextContent('v2 (latest)');
		expect(getByTestId('skill-version-diff-stat')).toHaveTextContent('+1 −0');
	});

	it('compares the unsaved edits without loading them', async () => {
		const loadVersion = vi.fn(async (versionNumber: number) => CONTENTS[versionNumber]);
		const { findByTestId } = renderComponent({
			props: {
				versions: [summary(2), summary(1)],
				latestVersion: 2,
				loadVersion,
				unsavedSkill: content('one\ntwo\nthree'),
				from: 2,
				to: 'unsaved',
			},
		});

		expect(await findByTestId('skill-version-diff-to')).toHaveTextContent('Your unsaved changes');
		expect(loadVersion).toHaveBeenCalledTimes(1);
	});

	it('swaps the two sides', async () => {
		const loadVersion = vi.fn(async (versionNumber: number) => CONTENTS[versionNumber]);
		const { findByTestId, getByTestId, emitted } = renderComponent({
			props: { versions: [summary(2), summary(1)], latestVersion: 2, loadVersion, from: 1, to: 2 },
		});
		await findByTestId('skill-version-diff');

		await fireEvent.click(getByTestId('skill-version-compare-swap'));

		expect(emitted('update:from')).toEqual([[2]]);
		expect(emitted('update:to')).toEqual([[1]]);
	});

	it('reports a version that does not load', async () => {
		const loadVersion = vi.fn(async () => {
			throw new Error('gone');
		});
		renderComponent({
			props: { versions: [summary(2), summary(1)], latestVersion: 2, loadVersion, from: 1, to: 2 },
		});

		await waitFor(() => expect(showError).toHaveBeenCalled());
	});

	it('closes', async () => {
		const loadVersion = vi.fn(async (versionNumber: number) => CONTENTS[versionNumber]);
		const { getByTestId, emitted } = renderComponent({
			props: { versions: [summary(2), summary(1)], latestVersion: 2, loadVersion, from: 1, to: 2 },
		});

		await fireEvent.click(getByTestId('skill-version-compare-close'));

		expect(emitted('close')).toHaveLength(1);
	});
});
