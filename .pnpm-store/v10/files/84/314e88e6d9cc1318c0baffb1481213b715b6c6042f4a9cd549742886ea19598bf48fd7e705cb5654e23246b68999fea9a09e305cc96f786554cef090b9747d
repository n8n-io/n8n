import { global as globalThis } from '@storybook/global';
import { setup } from '@storybook/vue3';

const somePlugin = {
  install: (app, options) => {
    // inject a globally available $greetingText() method

    app.config.globalProperties.$greetingMessage = (key) => {
      // retrieve a nested property in `options`
      // using `key`
      return options.greetings[key];
    };
  },
};
const someColor = 'someColor';

// add components to global scope
setup((app) => {
  // This adds a component that can be used globally in stories
  app.component('GlobalButton', globalThis.__TEMPLATE_COMPONENTS__.Button);
});

// this adds a plugin to vue app that can be used globally in stories
setup((app, context) => {
  app.use(somePlugin, {
    greetings: {
      hello: `Hello Story! from some plugin your name is ${context?.name}!`,
      welcome: `Welcome Story! from some plugin your name is ${context?.name}!`,
      hi: `Hi Story! from some plugin your name is ${context?.name}!`,
    },
  });
});

// additonal setup to provide some propriety  to the app
setup((app, context) => {
  app.provide(someColor, 'green');
});
