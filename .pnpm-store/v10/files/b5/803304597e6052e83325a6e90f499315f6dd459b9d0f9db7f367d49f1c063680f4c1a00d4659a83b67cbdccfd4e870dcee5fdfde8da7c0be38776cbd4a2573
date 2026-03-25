declare module "regexpu-core" {
  export type RegexpuOptions = {
    unicodeFlag?: "transform" | false;
    unicodeSetsFlag?: "transform" | false;
    dotAllFlag?: "transform" | false;
    unicodePropertyEscapes?: "transform" | false;
    namedGroups?: "transform" | false;
    onNamedGroup?: (name: string, index: number) => void;
    modifiers?: "transform" | false | "parse";
    onNewFlags?: (flags: string) => void;
  };
  export default function rewritePattern(
    pattern: string,
    flags: string,
    options: RegexpuOptions | undefined
  ): string;
}
