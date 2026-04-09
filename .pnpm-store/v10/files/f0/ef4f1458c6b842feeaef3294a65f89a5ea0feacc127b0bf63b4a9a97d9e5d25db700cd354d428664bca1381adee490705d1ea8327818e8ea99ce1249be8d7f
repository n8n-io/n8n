import CJS_COMPAT_NODE_URL_plmkhzyfcj from 'node:url';
import CJS_COMPAT_NODE_PATH_plmkhzyfcj from 'node:path';
import CJS_COMPAT_NODE_MODULE_plmkhzyfcj from "node:module";

var __filename = CJS_COMPAT_NODE_URL_plmkhzyfcj.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_plmkhzyfcj.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_plmkhzyfcj.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import "./chunk-ZUFKVVHZ.js";

// raw:../templates/vitest.config.3.2.template
var vitest_config_3_2_default = `import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, 'CONFIG_DIR') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
`;
export {
  vitest_config_3_2_default as default
};
