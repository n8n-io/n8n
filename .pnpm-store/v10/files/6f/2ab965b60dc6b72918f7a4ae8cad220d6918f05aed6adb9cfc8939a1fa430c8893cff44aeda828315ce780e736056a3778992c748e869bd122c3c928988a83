import OverrideArgs from './OverrideArgs.vue';

// Emulate something that isn't serializable
const icons = {
  Primary: {
    template: '<span>Primary Icon</span>',
  },
  Secondary: {
    template: '<span>Secondary Icon</span>',
  },
};

const meta = {
  component: OverrideArgs,
  argTypes: {
    // To show that other props are passed through
    backgroundColor: { control: 'color' },
    icon: {
      control: {
        type: 'select',
        options: Object.keys(icons),
      },
    },
  },
  render: (args) => {
    // Individual properties can be overridden by spreading the args
    // and the replacing the key-values that need to be updated
    args = { ...args, icon: icons[args.icon || 'Primary'] };
    return {
      // Components used in your story `template` are defined in the `components` object
      components: { OverrideArgs },
      // Updated `args` need to be mapped into the template through the `setup()` method
      setup() {
        return { args };
      },
      // And then the `args` are bound to your component with `v-bind="args"`
      template: '<override-args v-bind="args" />',
    };
  },
};

export default meta;

export const TestOne = {};
