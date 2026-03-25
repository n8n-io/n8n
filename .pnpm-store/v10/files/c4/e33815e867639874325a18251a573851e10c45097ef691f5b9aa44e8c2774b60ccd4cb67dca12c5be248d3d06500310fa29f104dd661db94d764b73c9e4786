import { Loading } from './src/service.mjs';
export { Loading as ElLoadingService } from './src/service.mjs';
import { vLoading } from './src/directive.mjs';
export { vLoading as ElLoadingDirective, vLoading } from './src/directive.mjs';
import './src/types.mjs';

const ElLoading = {
  install(app) {
    app.directive("loading", vLoading);
    app.config.globalProperties.$loading = Loading;
  },
  directive: vLoading,
  service: Loading
};

export { ElLoading, ElLoading as default };
//# sourceMappingURL=index.mjs.map
