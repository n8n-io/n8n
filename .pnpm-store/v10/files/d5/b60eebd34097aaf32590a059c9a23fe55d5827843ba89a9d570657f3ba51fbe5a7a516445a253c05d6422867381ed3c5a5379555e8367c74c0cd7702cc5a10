import MarkdownIt, {} from "markdown-it";
import { computed, defineComponent, h, shallowRef } from "vue";
const VueMarkdown = defineComponent((props) => {
    const md = shallowRef(new MarkdownIt(props.options ?? {}));
    for (const plugin of props.plugins ?? []) {
        md.value.use(plugin);
    }
    const content = computed(() => md.value.render(props.source));
    return () => h("div", { innerHTML: content.value });
}, {
    props: ["source", "options", "plugins"],
});
export default VueMarkdown;
//# sourceMappingURL=VueMarkdown.js.map