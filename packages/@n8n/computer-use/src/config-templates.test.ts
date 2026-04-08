import type { TemplateName } from './config-templates';
import { CONFIG_TEMPLATES, getTemplate } from './config-templates';

describe('CONFIG_TEMPLATES', () => {
	it('contains exactly recommended, yolo, and custom templates', () => {
		expect(CONFIG_TEMPLATES.map((t) => t.name)).toEqual(['default', 'yolo', 'custom']);
	});

	it('covers all tool groups on every template', () => {
		const expectedGroups = ['filesystemRead', 'filesystemWrite', 'shell', 'computer', 'browser'];
		for (const tpl of CONFIG_TEMPLATES) {
			expect(Object.keys(tpl.permissions).sort()).toEqual(expectedGroups.sort());
		}
	});

	describe('recommended template', () => {
		it('matches the spec table', () => {
			expect(getTemplate('default').permissions).toEqual({
				filesystemRead: 'allow',
				filesystemWrite: 'ask',
				shell: 'deny',
				computer: 'deny',
				browser: 'ask',
			});
		});
	});

	describe('yolo template', () => {
		it('sets all groups to allow', () => {
			const { permissions } = getTemplate('yolo');
			for (const mode of Object.values(permissions)) {
				expect(mode).toBe('allow');
			}
		});
	});

	describe('custom template', () => {
		it('is defined', () => {
			expect(getTemplate('custom')).toBeDefined();
		});

		it('has valid permission modes on all groups', () => {
			const valid = new Set(['deny', 'ask', 'allow']);
			for (const mode of Object.values(getTemplate('custom').permissions)) {
				expect(valid.has(mode)).toBe(true);
			}
		});
	});
});

describe('getTemplate', () => {
	it('throws for unknown template name', () => {
		expect(() => getTemplate('unknown' as TemplateName)).toThrow('Unknown template: unknown');
	});
});
