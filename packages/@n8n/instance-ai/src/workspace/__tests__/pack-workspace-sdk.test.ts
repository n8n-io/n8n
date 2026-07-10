import { isLinkWorkspaceSdkEnabled } from '../pack-workspace-sdk';

const LINK_WORKSPACE_SDK_ENV = 'N8N_INSTANCE_AI_SANDBOX_LINK_SDK';

describe('isLinkWorkspaceSdkEnabled', () => {
	const originalValue = process.env[LINK_WORKSPACE_SDK_ENV];

	afterEach(() => {
		if (originalValue === undefined) {
			delete process.env[LINK_WORKSPACE_SDK_ENV];
		} else {
			process.env[LINK_WORKSPACE_SDK_ENV] = originalValue;
		}
	});

	it('enables linking automatically for a local workflow SDK workspace checkout', () => {
		delete process.env[LINK_WORKSPACE_SDK_ENV];

		expect(isLinkWorkspaceSdkEnabled()).toBe(true);
	});

	it('allows automatic workspace linking to be explicitly disabled', () => {
		process.env[LINK_WORKSPACE_SDK_ENV] = 'false';

		expect(isLinkWorkspaceSdkEnabled()).toBe(false);
	});
});
