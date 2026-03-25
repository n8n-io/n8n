import { PluginSimple, PluginWithOptions } from "markdown-it";

export as namespace markdownitEmoji;

declare namespace markdownitEmoji {
    interface Options {
        defs?: Record<string, string> | undefined;
        enabled?: string[] | undefined;
        shortcuts?: Shortcuts | undefined;
    }

    type LiteralUnion<T extends U, U = string> = T | (U & { _?: never | undefined });

    type PartialRecord<K extends keyof any, T> = {
        [P in K]?: T | T[];
    };

    type Shortcuts = PartialRecord<Shortcut, string>;

    type Shortcut = LiteralUnion<
        | "angry"
        | "blush"
        | "broken_heart"
        | "confused"
        | "cry"
        | "frowning"
        | "heart"
        | "imp"
        | "innocent"
        | "joy"
        | "kissing"
        | "laughing"
        | "neutral_face"
        | "open_mouth"
        | "rage"
        | "smile"
        | "smiley"
        | "smiling_imp"
        | "sob"
        | "stuck_out_tongue"
        | "sunglasses"
        | "sweat_smile"
        | "sweat"
        | "unamused"
        | "wink"
    >;
}

declare const markdownitEmoji: PluginSimple | PluginWithOptions<markdownitEmoji.Options>;
export = markdownitEmoji;
