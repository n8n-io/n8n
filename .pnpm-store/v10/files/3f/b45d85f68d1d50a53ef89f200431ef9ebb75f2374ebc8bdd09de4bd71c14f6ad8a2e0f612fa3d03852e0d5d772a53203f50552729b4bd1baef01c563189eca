import { NOOP } from '@vue/shared';

const withInstall = (main, extra) => {
  ;
  main.install = (app) => {
    for (const comp of [main, ...Object.values(extra != null ? extra : {})]) {
      app.component(comp.name, comp);
    }
  };
  if (extra) {
    for (const [key, comp] of Object.entries(extra)) {
      ;
      main[key] = comp;
    }
  }
  return main;
};
const withInstallFunction = (fn, name) => {
  ;
  fn.install = (app) => {
    ;
    fn._context = app._context;
    app.config.globalProperties[name] = fn;
  };
  return fn;
};
const withInstallDirective = (directive, name) => {
  ;
  directive.install = (app) => {
    app.directive(name, directive);
  };
  return directive;
};
const withNoopInstall = (component) => {
  ;
  component.install = NOOP;
  return component;
};

export { withInstall, withInstallDirective, withInstallFunction, withNoopInstall };
//# sourceMappingURL=install.mjs.map
