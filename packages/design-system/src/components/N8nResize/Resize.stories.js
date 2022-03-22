import { action } from '@storybook/addon-actions';
import N8nResize from './Resize.vue';

export default {
  title: 'Atoms/Resize',
  component: N8nResize,
  argTypes: {
    
  },
};

const methods = {

};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: {
    N8nResize,
  },
  template:
    '<n8n-resize v-bind="$props"><slot></slot></n8n-resize>',
  methods,
});

export const Resize = Template.bind({});
Resize.args = {
  
};