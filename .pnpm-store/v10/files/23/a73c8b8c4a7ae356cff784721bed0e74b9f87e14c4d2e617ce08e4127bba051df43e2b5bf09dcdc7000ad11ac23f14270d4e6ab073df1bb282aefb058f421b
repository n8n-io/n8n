'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../utils/index.js');
var configProvider = require('./src/config-provider.js');
var configProviderProps = require('./src/config-provider-props.js');
var constants = require('./src/constants.js');
var useGlobalConfig = require('./src/hooks/use-global-config.js');
var install = require('../../utils/vue/install.js');

const ElConfigProvider = install.withInstall(configProvider["default"]);

exports.messageConfig = configProvider.messageConfig;
exports.configProviderProps = configProviderProps.configProviderProps;
exports.configProviderContextKey = constants.configProviderContextKey;
exports.provideGlobalConfig = useGlobalConfig.provideGlobalConfig;
exports.useGlobalComponentSettings = useGlobalConfig.useGlobalComponentSettings;
exports.useGlobalConfig = useGlobalConfig.useGlobalConfig;
exports.ElConfigProvider = ElConfigProvider;
exports["default"] = ElConfigProvider;
//# sourceMappingURL=index.js.map
