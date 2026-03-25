import { fromRollup } from "@web/dev-server-rollup";
import rollupCommonjs from "@rollup/plugin-commonjs";

const commonjs = fromRollup(rollupCommonjs);

export default {
  nodeResolve: true,
  files: [
    "test/*.js",
    "!test/virtual-machines.js"
  ],
  plugins: [
    commonjs({
      include: [
        // the commonjs plugin is slow, list the required packages explicitly:
        "**/node_modules/type-detect/**/*",
      ],
    }),
  ],
};
