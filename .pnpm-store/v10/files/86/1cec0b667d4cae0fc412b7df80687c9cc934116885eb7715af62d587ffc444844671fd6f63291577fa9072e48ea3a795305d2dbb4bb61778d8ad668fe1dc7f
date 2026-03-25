"use strict";

const path = require("path");

module.exports = { loadModule, isModuleNotFoundError };

function loadModule(moduleName) {
	try {
		const m = require("module");
		const cwd = process.cwd();
		const relativeTo = path.join(cwd, "__placeholder__.js");
		// eslint-disable-next-line n/no-unsupported-features/node-builtins -- ignore
		return m.createRequire(relativeTo)(moduleName);
	} catch (error) {
		if (!isModuleNotFoundError(error)) {
			throw error;
		}
		// ignore
	}
	return null;
}

function isModuleNotFoundError(error) {
	return (
		error && typeof error === "object" && error.code === "MODULE_NOT_FOUND"
	);
}
