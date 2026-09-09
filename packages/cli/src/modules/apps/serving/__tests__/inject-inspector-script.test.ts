import { injectInspectorScript } from '../inject-inspector-script';

describe('injectInspectorScript', () => {
	test('inserts the script tag before </body>', () => {
		const html = '<html><body><h1>Hi</h1></body></html>';
		expect(injectInspectorScript(html)).toBe(
			'<html><body><h1>Hi</h1><script src="/apps-inspector.js" defer></script></body></html>',
		);
	});

	test('appends the script tag when there is no </body>', () => {
		const html = '<html><body><h1>Hi</h1>';
		expect(injectInspectorScript(html)).toBe(
			'<html><body><h1>Hi</h1><script src="/apps-inspector.js" defer></script>',
		);
	});

	test('targets the last </body> when the markup has more than one', () => {
		const html = '<body>a</body><!-- </body> --><body>b</body>';
		expect(injectInspectorScript(html)).toBe(
			'<body>a</body><!-- </body> --><body>b<script src="/apps-inspector.js" defer></script></body>',
		);
	});
});
