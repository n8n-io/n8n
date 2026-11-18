// Capture the greeting logger before the demo silences application output.
import '@/app/init/consoleGreeting';

if (
	import.meta.env.DEV &&
	import.meta.env.VUE_APP_CANVAS_DELIGHT === 'true' &&
	import.meta.env.VUE_APP_CANVAS_DELIGHT_QUIET_CONSOLE === 'true'
) {
	const methods = [
		'assert',
		'clear',
		'count',
		'debug',
		'dir',
		'dirxml',
		'error',
		'group',
		'groupCollapsed',
		'groupEnd',
		'info',
		'log',
		'table',
		'timeEnd',
		'timeLog',
		'trace',
		'warn',
	] as const;

	const restoreMethods = methods.map((method) => {
		const original = console[method];
		console[method] = () => {};
		return () => Object.assign(console, { [method]: original });
	});

	import.meta.hot?.dispose(() => {
		for (const restore of restoreMethods) restore();
	});
}
