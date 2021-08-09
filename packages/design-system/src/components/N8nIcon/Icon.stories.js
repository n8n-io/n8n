import N8nIcon from "./Icon.vue";

export default {
  title: "Atoms/Icon",
  component: N8nIcon,
  argTypes: {
    icon: {
      control: "text",
    },
    size: {
      control: {
        type: "select",
        options: ["sm", "md", "lg"],
      },
    },
    spin: {
      control: {
        type: "boolean",
      },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: {
    N8nIcon,
  },
  template: '<n8n-icon v-bind="$props" />',
});

export const Clock = Template.bind({});
Clock.args = {
  icon: "clock",
};

export const Plus = Template.bind({});
Plus.args = {
  icon: "plus",
};

export const Stop = Template.bind({});
Stop.args = {
  icon: "stop",
};
