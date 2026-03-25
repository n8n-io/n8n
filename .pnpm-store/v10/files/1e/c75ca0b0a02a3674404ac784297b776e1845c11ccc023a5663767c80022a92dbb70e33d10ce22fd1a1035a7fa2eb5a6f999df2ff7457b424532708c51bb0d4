// to not bundle the provider
const name = "./provider.js";
async function loadProvider() {
	const { V8CoverageProvider } = await import(
		/* @vite-ignore */
		name
);
	return new V8CoverageProvider();
}

export { loadProvider as l };
