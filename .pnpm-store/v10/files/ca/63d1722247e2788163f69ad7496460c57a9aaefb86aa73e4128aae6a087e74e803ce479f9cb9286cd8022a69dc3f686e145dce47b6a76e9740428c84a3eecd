'use strict';

// process.memoryUsage() can throw on some platforms, see #67
function safeMemoryUsage() {
	try {
		return process.memoryUsage();
	} catch {
		return;
	}
}

module.exports = safeMemoryUsage;
