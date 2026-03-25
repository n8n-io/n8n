import { PluginWithOptions, Renderer } from "markdown-it";

declare namespace markdownItLinkAttributes {
    interface Config {
        attrs: Record<string, string>;
    }
}

/**
 * Link attributes plugin for markdown-it markdown parser
 */
declare const markdownItLinkAttributes:
    & PluginWithOptions<
        markdownItLinkAttributes.Config | markdownItLinkAttributes.Config[]
    >
    & {
        readonly defaultRender: Renderer.RenderRule;
    };

export = markdownItLinkAttributes;
