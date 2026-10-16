import type { AgentSkillVersionInfo, SkillVersionSummary } from '@n8n/api-types';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentSkillVersionBadge from './AgentSkillVersionBadge.vue';
import type { SkillVersionLoader } from './useSkillVersionLoader';

enableAutoUnmount(afterEach);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${JSON.stringify(options.interpolate)}` : key,
	}),
}));

const { showErrorSpy } = vi.hoisted(() => ({ showErrorSpy: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy }),
}));

// The real menu needs pointer events jsdom lacks. The stub keeps the slot and select contract.
vi.mock('@n8n/design-system', () => ({
	N8nBadge: { template: '<button v-bind="$attrs"><slot /></button>' },
	N8nText: { template: '<span><slot /></span>' },
	N8nTooltip: { props: ['content'], template: '<div :data-tooltip="content"><slot /></div>' },
	N8nDropdownMenu: {
		props: ['items', 'modelValue'],
		emits: ['select', 'update:modelValue'],
		template: `
			<div>
				<div data-testid="menu-trigger" @click="$emit('update:modelValue', true)"><slot name="trigger" /></div>
				<div v-if="modelValue">
					<template v-for="item in items" :key="item.id">
						<div v-if="item.header">{{ item.label }}</div>
						<div v-else :data-checked="item.checked" data-testid="menu-item" @click="$emit('select', item.id)">
							<slot name="item-label" :item="item" :ui="{ class: '' }">{{ item.label }}</slot>
							<slot name="item-trailing" :item="item" :ui="{ class: '' }" />
						</div>
					</template>
				</div>
			</div>
		`,
	},
}));

const versions: SkillVersionSummary[] = [3, 2, 1].map((version) => ({
	id: `00000000-0000-4000-8000-00000000000${version}`,
	version,
	label: version === 2 ? 'Holiday rules' : null,
	createdBy: { id: 'u1', email: 'ada@acme.test', firstName: 'Ada', lastName: 'Lovelace' },
	createdAt: '2026-10-01T00:00:00.000Z',
}));

function mountBadge(info: AgentSkillVersionInfo) {
	const loader: SkillVersionLoader = {
		loadVersions: vi.fn(async () => versions),
		loadVersion: vi.fn(),
	};
	const wrapper = mount(AgentSkillVersionBadge, {
		props: { skillId: 'refund', info, loader },
		global: { stubs: { TimeAgo: { template: '<span />' } } },
	});
	return { wrapper, loader };
}

async function openMenu(wrapper: ReturnType<typeof mountBadge>['wrapper']) {
	await wrapper.get('[data-testid="menu-trigger"]').trigger('click');
	await flushPromises();
}

describe('AgentSkillVersionBadge', () => {
	it.each([
		[{ draft: 3, live: 3, latest: 3, pinned: false, scope: 'project' }, 'latest', 'badge.latest'],
		[
			{ draft: 3, live: null, latest: 3, pinned: false, scope: 'project' },
			'notLive',
			'badge.notLive',
		],
		[
			{ draft: 3, live: 2, latest: 3, pinned: false, scope: 'project' },
			'liveBehind',
			'badge.liveBehind',
		],
		[{ draft: 2, live: 2, latest: 3, pinned: true, scope: 'project' }, 'pinned', 'badge.pinned'],
	])('shows the %o state', (info, kind, textKey) => {
		const { wrapper } = mountBadge(info);

		const badge = wrapper.get('[data-testid="agent-skill-version-badge"]');
		expect(badge.attributes('data-state')).toBe(kind);
		expect(badge.text()).toContain(`agents.builder.skills.version.${textKey}`);
	});

	it('lists every version on open and checks follow latest when the ref is not pinned', async () => {
		const { wrapper, loader } = mountBadge({
			draft: 3,
			live: 3,
			latest: 3,
			pinned: false,
			scope: 'project',
		});

		await openMenu(wrapper);

		expect(loader.loadVersions).toHaveBeenCalledWith('refund', 3);
		expect(wrapper.findAll('[data-testid="agent-skill-version-option"]')).toHaveLength(3);
		const [followLatest, ...options] = wrapper.findAll('[data-testid="menu-item"]');
		expect(followLatest.attributes('data-checked')).toBe('true');
		expect(options.every((option) => option.attributes('data-checked') === 'false')).toBe(true);
	});

	it('pins the version the user picks by its id', async () => {
		const { wrapper } = mountBadge({
			draft: 3,
			live: 3,
			latest: 3,
			pinned: false,
			scope: 'project',
		});
		await openMenu(wrapper);

		const option = wrapper
			.findAll('[data-testid="menu-item"]')
			.find((item) => item.find('[data-version="2"]').exists());
		await option?.trigger('click');

		expect(wrapper.emitted('pin')).toEqual([[versions[1].id, 2]]);
	});

	it('follows the latest version again from a pin, and ignores the current choice', async () => {
		const { wrapper } = mountBadge({
			draft: 2,
			live: 2,
			latest: 3,
			pinned: true,
			scope: 'project',
		});
		await openMenu(wrapper);

		const pinned = wrapper
			.findAll('[data-testid="menu-item"]')
			.find((item) => item.find('[data-version="2"]').exists());
		expect(pinned?.attributes('data-checked')).toBe('true');
		await pinned?.trigger('click');
		expect(wrapper.emitted('pin')).toBeUndefined();

		await wrapper.get('[data-testid="agent-skill-follow-latest"]').trigger('click');
		expect(wrapper.emitted('follow-latest')).toEqual([[]]);
	});

	it('does not emit follow latest when the ref already follows it', async () => {
		const { wrapper } = mountBadge({
			draft: 3,
			live: 3,
			latest: 3,
			pinned: false,
			scope: 'project',
		});
		await openMenu(wrapper);

		await wrapper.get('[data-testid="agent-skill-follow-latest"]').trigger('click');

		expect(wrapper.emitted('follow-latest')).toBeUndefined();
	});

	it('compares the draft with another version without pinning it', async () => {
		const { wrapper } = mountBadge({
			draft: 3,
			live: 3,
			latest: 3,
			pinned: false,
			scope: 'project',
		});
		await openMenu(wrapper);

		const compares = wrapper.findAll('[data-testid="agent-skill-version-compare"]');
		// The draft row has nothing to compare with itself.
		expect(compares).toHaveLength(2);
		await compares[1].trigger('click');

		expect(wrapper.emitted('compare')).toEqual([[3, 1]]);
		expect(wrapper.emitted('pin')).toBeUndefined();
	});

	it('reports a failed version load', async () => {
		const { wrapper, loader } = mountBadge({
			draft: 3,
			live: 3,
			latest: 3,
			pinned: false,
			scope: 'project',
		});
		vi.mocked(loader.loadVersions).mockRejectedValueOnce(new Error('offline'));

		await openMenu(wrapper);

		expect(showErrorSpy).toHaveBeenCalledWith(
			expect.any(Error),
			'agents.builder.skills.version.menu.loadError',
		);
		expect(wrapper.find('[data-testid="agent-skill-follow-latest"]').exists()).toBe(true);
	});
});
