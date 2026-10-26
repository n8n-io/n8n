import type { Logger } from '@n8n/backend-common';
import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { InboxSourceRegistry, type InboxSource } from '../inbox-source.registry';

describe('InboxSourceRegistry', () => {
	it('checks only the requested sources without listing or counting', async () => {
		const registry = new InboxSourceRegistry(mock<Logger>());
		const source = mock<InboxSource>({ type: 'workflow_review' });
		source.isEnabled.mockResolvedValue(true);
		registry.register(source);

		expect(await registry.getAllAvailable([])).toEqual({
			available: [],
			failedSources: [],
			disabledSources: [],
		});
		expect(source.isEnabled).not.toHaveBeenCalled();
		expect(await registry.getAllAvailable()).toEqual({
			available: [source],
			failedSources: [],
			disabledSources: [],
		});
		expect(source.list).not.toHaveBeenCalled();
		expect(source.count).not.toHaveBeenCalled();
	});

	it('distinguishes disabled and missing sources from failed availability checks', async () => {
		const logger = mock<Logger>();
		const registry = new InboxSourceRegistry(logger);
		const disabled = { available: [], failedSources: [], disabledSources: ['workflow_review'] };
		expect(await registry.getAllAvailable(['workflow_review'])).toEqual(disabled);

		const source = mock<InboxSource>({ type: 'workflow_review' });
		registry.register(source);
		source.isEnabled.mockResolvedValue(false);
		expect(await registry.getAllAvailable()).toEqual(disabled);

		const error = new Error('Availability failed');
		source.isEnabled.mockRejectedValue(error);
		expect(await registry.getAllAvailable()).toEqual({
			available: [],
			failedSources: ['workflow_review'],
			disabledSources: [],
		});
		expect(logger.warn).toHaveBeenCalledWith('Inbox source availability check failed', {
			type: 'workflow_review',
			error,
		});
	});

	it('rejects a duplicate without replacing the registered source', () => {
		const registry = new InboxSourceRegistry(mock<Logger>());
		const source = mock<InboxSource>({ type: 'workflow_review' });
		registry.register(source);
		expect(() => registry.register(mock<InboxSource>({ type: 'workflow_review' }))).toThrow(
			UnexpectedError,
		);
		expect(registry.find('workflow_review')).toBe(source);
		expect(registry.types()).toEqual(['workflow_review']);
	});
});
