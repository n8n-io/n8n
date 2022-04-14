import { action } from '@storybook/addon-actions';
import N8nSticky from './Sticky.vue';

export default {
  title: 'Atoms/Sticky',
  component: N8nSticky,
  argTypes: {
    content: {
      control: {
        control: 'text',
      },
    },
    height: {
      control: {
        control: 'number',
      }
    },
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
    readOnly: {
      control: {
        control: 'Boolean',
      },
    },
    width: {
      control: {
        control: 'number',
      }
    },
    zIndex: {
      control: {
        control: 'number',
      }
    },
  },
};

const methods = {
  onBlur: action('blur'),
  onChange: action('change'),
  onFocus: action('focus'),
  onInput: action('input'),
  onUnfocus: action('unfocus'),
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: {
    N8nSticky,
  },
  template:
    '<n8n-sticky v-bind="$props"  @blur="onBlur" @change="onChange" @focus="onFocus" @input="onInput" @unfocus="onUnfocus"></n8n-sticky>',
  methods,
});

export const Sticky = Template.bind({});
Sticky.args = {
  content: "## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/workflow-notes/)",
  height: 160,
  isDefaultTextChanged: false,
  isEditable: false,
  minHeight: 80,
  minWidth: 150,
  readOnly: false,
  width: 240,
  zIndex: -400,
};