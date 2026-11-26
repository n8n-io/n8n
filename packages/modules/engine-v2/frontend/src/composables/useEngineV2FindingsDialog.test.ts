import { useEngineV2FindingsDialog } from './useEngineV2FindingsDialog';

describe('useEngineV2FindingsDialog', () => {
	afterEach(() => useEngineV2FindingsDialog().close());

	it('shares one open state between callers', () => {
		const pill = useEngineV2FindingsDialog();
		const host = useEngineV2FindingsDialog();

		pill.open();
		expect(host.isOpen.value).toBe(true);

		host.close();
		expect(pill.isOpen.value).toBe(false);
	});
});
