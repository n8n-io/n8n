import { cdp } from '@vitest/browser/context';
import { l as loadProvider } from './load-provider-CdgAx3rL.js';

const session = cdp();
let enabled = false;
const mod = {
	async startCoverage() {
		if (enabled) {
			return;
		}
		enabled = true;
		await session.send("Profiler.enable");
		await session.send("Profiler.startPreciseCoverage", {
			callCount: true,
			detailed: true
		});
	},
	async takeCoverage() {
		const coverage = await session.send("Profiler.takePreciseCoverage");
		const result = [];
		// Reduce amount of data sent over rpc by doing some early result filtering
		for (const entry of coverage.result) {
			if (filterResult(entry)) {
				result.push({
					...entry,
					url: decodeURIComponent(entry.url.replace(window.location.origin, ""))
				});
			}
		}
		return { result };
	},
	stopCoverage() {
		// Browser mode should not stop coverage as same V8 instance is shared between tests
	},
	async getProvider() {
		return loadProvider();
	}
};
function filterResult(coverage) {
	if (!coverage.url.startsWith(window.location.origin)) {
		return false;
	}
	if (coverage.url.includes("/node_modules/")) {
		return false;
	}
	if (coverage.url.includes("__vitest_browser__")) {
		return false;
	}
	if (coverage.url.includes("__vitest__/assets")) {
		return false;
	}
	if (coverage.url === window.location.href) {
		return false;
	}
	return true;
}

export { mod as default };
