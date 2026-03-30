import type { GatewayConfig } from './config';
import { applyTemplate, resolveTemplateName } from './startup-config-cli';

const BASE_CONFIG: GatewayConfig = {
	logLevel: 'info',
	port: 7655,
	allowedOrigins: [],
	filesystem: { dir: '/tmp' },
	computer: { shell: { timeout: 30_000 } },
	browser: {
		defaultBrowser: 'chrome',
	},
	permissions: {},
};

describe('resolveTemplateName', () => {
	it('returns recommended for undefined', () => {
		expect(resolveTemplateName(undefined)).toBe('default');
	});

	it('returns recommended for unknown value', () => {
		expect(resolveTemplateName('bogus')).toBe('default');
	});

	it.each(['default', 'yolo', 'custom'] as const)('returns %s for valid name', (name) => {
		expect(resolveTemplateName(name)).toBe(name);
	});
});

describe('applyTemplate', () => {
	it('applies recommended template permissions', () => {
		const result = applyTemplate(BASE_CONFIG, 'default');
		expect(result.permissions).toMatchObject({
			filesystemRead: 'allow',
			filesystemWrite: 'ask',
			shell: 'deny',
			computer: 'deny',
			browser: 'ask',
		});
	});

	it('applies yolo template permissions', () => {
		const result = applyTemplate(BASE_CONFIG, 'yolo');
		for (const mode of Object.values(result.permissions)) {
			expect(mode).toBe('allow');
		}
	});

	it('CLI/ENV overrides in config.permissions win over template', () => {
		const config: GatewayConfig = {
			...BASE_CONFIG,
			permissions: { shell: 'allow' }, // explicit CLI override
		};
		const result = applyTemplate(config, 'default');
		// recommended says shell: deny, but CLI override says allow
		expect(result.permissions.shell).toBe('allow');
		// Other fields come from template
		expect(result.permissions.filesystemRead).toBe('allow');
	});

	it('does not mutate the input config', () => {
		const config: GatewayConfig = { ...BASE_CONFIG, permissions: {} };
		applyTemplate(config, 'yolo');
		expect(config.permissions).toEqual({});
	});
});
