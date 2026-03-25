import MarkdownIt, {
  type Options as MarkdownItOptions,
  type PluginSimple,
} from "markdown-it";
import {
  type Component,
  type PropType,
  computed,
  defineComponent,
  h,
  ref,
} from "vue";
export type { Options } from "markdown-it";

const VueMarkdown: Component = defineComponent({
  name: "VueMarkdown",
  props: {
    source: {
      type: String,
      required: true,
    },
    options: {
      type: Object as PropType<MarkdownItOptions>,
      required: false,
    },
    plugins: {
      type: Array as PropType<PluginSimple[]>,
      required: false,
    },
  },
  setup(props) {
    const md = ref<MarkdownIt>(new MarkdownIt(props.options ?? {}));

    for (const plugin of props.plugins ?? []) {
      md.value.use(plugin);
    }

    const content = computed(() => md.value.render(props.source));

    return () => h("div", { innerHTML: content.value });
  },
});

export default VueMarkdown;
