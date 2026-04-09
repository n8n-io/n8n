import MarkdownIt, {
  type Options as MarkdownItOptions,
  type PluginSimple,
} from "markdown-it";
import { computed, defineComponent, h, shallowRef } from "vue";
export type { Options } from "markdown-it";

const VueMarkdown = defineComponent(
  (props: {
    source: string;
    options?: MarkdownItOptions;
    plugins?: PluginSimple[];
  }) => {
    const md = shallowRef(new MarkdownIt(props.options ?? {}));

    for (const plugin of props.plugins ?? []) {
      md.value.use(plugin);
    }

    const content = computed(() => md.value.render(props.source));

    return () => h("div", { innerHTML: content.value });
  },
  {
    props: ["source", "options", "plugins"],
  }
);

export default VueMarkdown;
