import { createTestingPinia } from '@pinia/testing';
import { configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { SkillVersionSummary } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';

import SkillVersionTimeline from './SkillVersionTimeline.vue';

/** Lists the menu items as buttons, so a test can read and pick them. */
const actionDropdownStub = {
	props: ['items'],
	emits: ['select'],
	template: `<span data-testid="version-menu">
		<button v-for="item in items" :key="item.id" :data-testid="'version-menu-' + item.id" @click="$emit('select', item.id)">{{ item.label }}</button>
	</span>`,
};

configure({ testIdAttribute: 'data-testid' });

const renderTimeline = createComponentRenderer(SkillVersionTimeline, {
	global: { stubs: { N8nActionDropdown: actionDropdownStub, ActionDropdown: actionDropdownStub } },
});

function version(n: number): SkillVersionSummary {
	return {
		id: `v${n}`,
		version: n,
		createdAt: '2026-11-01T10:00:00.000Z',
		createdBy: null,
	} as SkillVersionSummary;
}

const versions = [version(3), version(2), version(1)];

function render(props: Partial<InstanceType<typeof SkillVersionTimeline>['$props']> = {}) {
	return renderTimeline({
		props: { versions, shownVersion: 3, canRestore: true, ...props },
		pinia: createTestingPinia(),
	});
}

describe('SkillVersionTimeline', () => {
	it('has no "Open version" item in the menu of a version', () => {
		const { getByTestId } = render({
			agent: { name: 'Support', draft: 3, published: null, pinned: false },
		});

		const menu = getByTestId('skill-version-actions-2');
		expect(menu.querySelector('[data-testid="version-menu-open"]')).toBeNull();
		expect(menu.querySelector('[data-testid="version-menu-use"]')).not.toBeNull();
		expect(menu.querySelector('[data-testid="version-menu-restore"]')).not.toBeNull();
	});

	it('opens a version on a click of its row', async () => {
		const { getByTestId, emitted } = render();

		await userEvent.click(getByTestId('skill-version-row-2'));

		expect(emitted('open')).toEqual([[2]]);
	});

	it('keeps the compare button in place for the shown version, so the row keeps its size', async () => {
		const { getByTestId, emitted } = render({ shownVersion: 2 });

		const compare = getByTestId('skill-version-compare-2');
		expect(compare).toBeDisabled();
		expect(compare).toHaveAttribute('aria-hidden', 'true');
		await userEvent.click(compare);
		expect(emitted('compare')).toBeUndefined();

		await userEvent.click(getByTestId('skill-version-compare-1'));
		expect(emitted('compare')).toEqual([[1]]);
	});
});
