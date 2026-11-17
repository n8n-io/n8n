import { findExportingFile } from '../compiled-node-sources';

describe('findExportingFile', () => {
	class Example {}

	it('finds the module that exports the class', () => {
		const modules = [
			{ exports: { Other: class {} }, filename: '/other.js' },
			{ exports: { Example }, filename: '/example.node.js' },
		];

		expect(findExportingFile(modules, Example)).toBe('/example.node.js');
	});

	it('does not call the getters of other modules', () => {
		const withGetter = {};
		Object.defineProperty(withGetter, 'query', {
			enumerable: true,
			get() {
				throw new Error('This getter needs a request');
			},
		});
		const modules = [
			{ exports: withGetter, filename: '/request.js' },
			undefined,
			{ exports: 'text', filename: '/text.js' },
			{ exports: { Example }, filename: '/example.node.js' },
		];

		expect(findExportingFile(modules, Example)).toBe('/example.node.js');
	});

	it('gives nothing when no module exports the class', () => {
		expect(findExportingFile([{ exports: {}, filename: '/empty.js' }], Example)).toBeUndefined();
	});
});
