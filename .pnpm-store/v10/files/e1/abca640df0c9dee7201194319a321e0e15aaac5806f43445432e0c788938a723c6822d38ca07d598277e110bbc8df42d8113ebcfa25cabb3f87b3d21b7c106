import inspector from 'node:inspector';
import { fileURLToPath } from 'node:url';
import { provider } from 'std-env';
import { l as loadProvider } from './load-provider-CdgAx3rL.js';

const session = new inspector.Session();
let enabled = false;
const mod = {
	async startCoverage({ isolate }) {
		if (isolate === false && enabled) {
			return;
		}
		enabled = true;
		session.connect();
		await new Promise((resolve) => session.post("Profiler.enable", resolve));
		await new Promise((resolve) => session.post("Profiler.startPreciseCoverage", {
			callCount: true,
			detailed: true
		}, resolve));
	},
	takeCoverage(options) {
		return new Promise((resolve, reject) => {
			session.post("Profiler.takePreciseCoverage", async (error, coverage) => {
				if (error) {
					return reject(error);
				}
				try {
					const result = coverage.result.filter(filterResult).map((res) => ({
						...res,
						startOffset: options?.moduleExecutionInfo?.get(fileURLToPath(res.url))?.startOffset || 0
					}));
					resolve({ result });
				} catch (e) {
					reject(e);
				}
			});
			if (provider === "stackblitz") {
				resolve({ result: [] });
			}
		});
	},
	async stopCoverage({ isolate }) {
		if (isolate === false) {
			return;
		}
		await new Promise((resolve) => session.post("Profiler.stopPreciseCoverage", resolve));
		await new Promise((resolve) => session.post("Profiler.disable", resolve));
		session.disconnect();
	},
	async getProvider() {
		return loadProvider();
	}
};
function filterResult(coverage) {
	if (!coverage.url.startsWith("file://")) {
		return false;
	}
	if (coverage.url.includes("/node_modules/")) {
		return false;
	}
	return true;
}

export { mod as default };
