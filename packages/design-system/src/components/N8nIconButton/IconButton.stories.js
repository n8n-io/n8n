import N8nIconButton from "./IconButton.vue";
import { action } from "@storybook/addon-actions";

export default {
  title: "Atoms/Icon Button",
  component: N8nIconButton,
  argTypes: {
    type: {
      control: "select",
      options: ["primary", "outline", "light", "text"],
    },
    title: {
      control: "text",
    },
    size: {
      control: {
        type: "select",
        options: ["sm", "md", "lg", "xl"],
      },
    },
    loading: {
      control: {
        type: "boolean",
      },
    },
    icon: {
      control: {
        type: "text",
      },
    },
    theme: {
      control: {
        type: "select",
        options: ["success", "warning", "danger"],
      },
    },
  },
  parameters: {
    backgrounds: { default: "--color-background-light" },
  },
};

const methods = {
  onClick: action("click"),
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: {
    N8nIconButton,
  },
  template: '<n8n-icon-button v-bind="$props" @click="onClick" />',
  methods,
});

export const Button = Template.bind({});
Button.args = {
  icon: "plus",
  title: "my title",
};

const ManyTemplate = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: {
    N8nIconButton,
  },
  template:
    '<div> <n8n-icon-button v-bind="$props" size="lg" @click="onClick" />  <n8n-icon-button v-bind="$props" size="md" @click="onClick" />  <n8n-icon-button v-bind="$props" size="sm" @click="onClick" />  <n8n-icon-button v-bind="$props" :loading="true" @click="onClick" />  <n8n-icon-button v-bind="$props" :disabled="true" @click="onClick" /></div>',
  methods,
});

export const Primary = ManyTemplate.bind({});
Primary.args = {
  icon: "plus",
  title: "my title",
  type: "primary",
};

export const Outline = ManyTemplate.bind({});
Outline.args = {
  icon: "plus",
  title: "my title",
  type: "outline",
};

export const Light = ManyTemplate.bind({});
Light.args = {
  icon: "plus",
  title: "my title",
  type: "light",
};

export const Text = ManyTemplate.bind({});
Text.args = {
  icon: "plus",
  title: "my title",
  type: "text",
};
