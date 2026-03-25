/**
* vue v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
import { initCustomFormatter, warn } from '@vue/runtime-dom';
export * from '@vue/runtime-dom';

function initDev() {
  {
    initCustomFormatter();
  }
}

if (!!(process.env.NODE_ENV !== "production")) {
  initDev();
}
const compile = () => {
  if (!!(process.env.NODE_ENV !== "production")) {
    warn(
      `Runtime compilation is not supported in this build of Vue.` + (` Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".` )
    );
  }
};

export { compile };
