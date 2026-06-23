/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { useAgentResourceLocatorModes } from './useAgentResourceLocatorModes';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const rlc = (
	overrides: Partial<INodeParameterResourceLocator> = {},
): INodeParameterResourceLocator => ({
	__rl: true,
	mode: 'list',
	value: '',
	...overrides,
});

describe('useAgentResourceLocatorModes', () => {
	it('keeps the raw value without re-caching the name when switching list → id', () => {
		const modelValue = ref(rlc({ mode: 'list', value: 'agent-1', cachedResultName: 'Support' }));
		const getAgentName = vi.fn();
		const { getUpdatedModePayload } = useAgentResourceLocatorModes(modelValue, getAgentName);

		expect(getUpdatedModePayload('id')).toEqual({ __rl: true, mode: 'id', value: 'agent-1' });
		expect(getAgentName).not.toHaveBeenCalled();
	});

	it('caches the display name for other transitions', () => {
		const modelValue = ref(rlc({ mode: 'id', value: 'agent-1' }));
		const getAgentName = vi.fn().mockReturnValue('Support Agent');
		const { getUpdatedModePayload } = useAgentResourceLocatorModes(modelValue, getAgentName);

		expect(getUpdatedModePayload('list')).toEqual({
			__rl: true,
			mode: 'list',
			value: 'agent-1',
			cachedResultName: 'Support Agent',
		});
		expect(getAgentName).toHaveBeenCalledWith('agent-1');
	});

	it('defaults selectedMode to list when unset and tracks isListMode', () => {
		const modelValue = ref(rlc({ mode: undefined as any }));
		const { selectedMode, isListMode } = useAgentResourceLocatorModes(modelValue, vi.fn());

		expect(selectedMode.value).toBe('list');
		expect(isListMode.value).toBe(true);
	});

	it('falls back to the mode displayName for an unknown mode and localizes known ones', () => {
		const modelValue = ref(rlc());
		const { getModeLabel } = useAgentResourceLocatorModes(modelValue, vi.fn());

		expect(getModeLabel({ name: 'url', type: 'string', displayName: 'By URL' })).toBe('By URL');
		expect(getModeLabel({ name: 'list', type: 'list', displayName: 'ignored' })).toBe(
			'resourceLocator.mode.list',
		);
	});
});
