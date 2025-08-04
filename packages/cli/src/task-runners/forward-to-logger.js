'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.forwardToLogger = forwardToLogger;
function forwardToLogger(logger, producer, prefix) {
	if (prefix) {
		prefix = prefix.trimEnd();
	}
	const stringify = (data) => {
		let str = data.toString();
		if (str.endsWith('\n')) {
			str = str.slice(0, -1);
		}
		return prefix ? `${prefix} ${str}` : str;
	};
	if (producer.stdout) {
		producer.stdout.on('data', (data) => {
			logger.info(stringify(data));
		});
	}
	if (producer.stderr) {
		producer.stderr.on('data', (data) => {
			logger.error(stringify(data));
		});
	}
}
//# sourceMappingURL=forward-to-logger.js.map
