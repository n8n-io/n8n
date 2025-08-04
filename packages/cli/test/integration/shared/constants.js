'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.COMMUNITY_NODE_VERSION =
	exports.COMMUNITY_PACKAGE_VERSION =
	exports.LOGGED_OUT_RESPONSE_BODY =
	exports.SUCCESS_RESPONSE_BODY =
	exports.PUBLIC_API_REST_PATH_SEGMENT =
	exports.REST_PATH_SEGMENT =
		void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
exports.REST_PATH_SEGMENT = di_1.Container.get(config_1.GlobalConfig).endpoints.rest;
exports.PUBLIC_API_REST_PATH_SEGMENT = di_1.Container.get(config_1.GlobalConfig).publicApi.path;
exports.SUCCESS_RESPONSE_BODY = {
	data: {
		success: true,
	},
};
exports.LOGGED_OUT_RESPONSE_BODY = {
	data: {
		loggedOut: true,
	},
};
exports.COMMUNITY_PACKAGE_VERSION = {
	CURRENT: '0.1.0',
	UPDATED: '0.2.0',
};
exports.COMMUNITY_NODE_VERSION = {
	CURRENT: 1,
	UPDATED: 2,
};
//# sourceMappingURL=constants.js.map
