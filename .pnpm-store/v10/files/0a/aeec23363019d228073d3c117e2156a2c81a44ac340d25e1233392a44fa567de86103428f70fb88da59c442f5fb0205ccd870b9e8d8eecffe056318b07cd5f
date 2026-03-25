import './components/config-provider/index.mjs';
import './constants/index.mjs';
import { version } from './version.mjs';
import { INSTALLED_KEY } from './constants/key.mjs';
import { provideGlobalConfig } from './components/config-provider/src/hooks/use-global-config.mjs';

const makeInstaller = (components = []) => {
  const install = (app, options) => {
    if (app[INSTALLED_KEY])
      return;
    app[INSTALLED_KEY] = true;
    components.forEach((c) => app.use(c));
    if (options)
      provideGlobalConfig(options, app, true);
  };
  return {
    version,
    install
  };
};

export { makeInstaller };
//# sourceMappingURL=make-installer.mjs.map
