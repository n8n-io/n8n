import { RunStateRegistry } from '../run-state-registry';

describe('RunStateRegistry', () => {
	it('indexes runs by message group without duplicates', () => {
		const registry = new RunStateRegistry();

		registry.indexRunInGroup('thread-1', 'mg-1', 'run-1');
		registry.indexRunInGroup('thread-1', 'mg-1', 'run-2');
		registry.indexRunInGroup('thread-1', 'mg-1', 'run-1');

		expect(registry.getMessageGroupId('thread-1')).toBe('mg-1');
		expect(registry.getRunIdsForMessageGroup('mg-1')).toEqual(['run-1', 'run-2']);
		expect(registry.getRunIdsForMessageGroup('unknown')).toEqual([]);
	});

	it('keeps per-thread request options and clears omitted values', () => {
		const registry = new RunStateRegistry();

		registry.setTimeZone('thread-1', 'Europe/Helsinki');
		registry.setBuildMode('thread-1', 'progressive');
		registry.setPromptVersion('thread-1', 'concise@1');
		registry.setObserverThresholdTokens('thread-1', 1000);
		registry.setSetupPanelEnabled('thread-1', true);

		expect(registry.getTimeZone('thread-1')).toBe('Europe/Helsinki');
		expect(registry.getBuildMode('thread-1')).toBe('progressive');
		expect(registry.getPromptVersion('thread-1')).toBe('concise@1');
		expect(registry.getObserverThresholdTokens('thread-1')).toBe(1000);
		expect(registry.isSetupPanelEnabled('thread-1')).toBe(true);

		registry.setBuildMode('thread-1', undefined);
		registry.setObserverThresholdTokens('thread-1', undefined);

		expect(registry.getBuildMode('thread-1')).toBeUndefined();
		expect(registry.getObserverThresholdTokens('thread-1')).toBeUndefined();
	});

	it('removes all state for a cleared thread', () => {
		const registry = new RunStateRegistry();
		registry.indexRunInGroup('thread-1', 'mg-1', 'run-1');
		registry.setTimeZone('thread-1', 'UTC');
		registry.indexRunInGroup('thread-2', 'mg-2', 'run-2');

		registry.clearThread('thread-1');

		expect(registry.getMessageGroupId('thread-1')).toBeUndefined();
		expect(registry.getRunIdsForMessageGroup('mg-1')).toEqual([]);
		expect(registry.getTimeZone('thread-1')).toBeUndefined();
		expect(registry.getRunIdsForMessageGroup('mg-2')).toEqual(['run-2']);
	});
});
