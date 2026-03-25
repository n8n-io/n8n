'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('./components/config-provider/index.js');
require('./constants/index.js');
var version = require('./version.js');
var key = require('./constants/key.js');
var useGlobalConfig = require('./components/config-provider/src/hooks/use-global-config.js');

const makeInstaller = (components = []) => {
  const install = (app, options) => {
    if (app[key.INSTALLED_KEY])
      return;
    app[key.INSTALLED_KEY] = true;
    components.forEach((c) => app.use(c));
    if (options)
      useGlobalConfig.provideGlobalConfig(options, app, true);
  };
  return {
    version: version.version,
    install
  };
};

exports.makeInstaller = makeInstaller;
//# sourceMappingURL=make-installer.js.map
