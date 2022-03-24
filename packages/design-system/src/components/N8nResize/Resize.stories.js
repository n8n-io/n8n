import N8nResize from './Resize.vue';

export default {
  title: 'Atoms/Resize',
  component: N8nResize,
  argTypes: {
    minHeight: {
      control: {
        control: 'number',
      }
    },
    minWidth: {
      control: {
        control: 'number',
      }
    },
    resizer: {
      control: {
        control: 'text',
      },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: {
    N8nResize,
  },
  template:
    '<n8n-resize v-bind="$props"><slot></slot></n8n-resize>',
});

export const Resize = Template.bind({});
Resize.args = {
  minHeight: 80,
  minWidth: 150,
};