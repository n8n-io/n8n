interface DedentOptions {
    alignValues?: boolean;
    escapeSpecialCharacters?: boolean;
    trimWhitespace?: boolean;
}
interface Dedent {
    (literals: string): string;
    (strings: TemplateStringsArray, ...values: unknown[]): string;
    withOptions: CreateDedent;
}
type CreateDedent = (options: DedentOptions) => Dedent;

declare const dedent: Dedent;

export { CreateDedent, Dedent, DedentOptions, dedent as default };
