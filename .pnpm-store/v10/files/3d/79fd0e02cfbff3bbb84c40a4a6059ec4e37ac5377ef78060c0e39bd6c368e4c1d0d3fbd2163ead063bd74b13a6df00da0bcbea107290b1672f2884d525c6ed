declare const LinkifyIt: {
    (
        schemas?: LinkifyIt.SchemaRules | LinkifyIt.Options,
        options?: LinkifyIt.Options,
    ): LinkifyIt.LinkifyIt;
    new(
        schemas?: LinkifyIt.SchemaRules | LinkifyIt.Options,
        options?: LinkifyIt.Options,
    ): LinkifyIt.LinkifyIt;
};

declare namespace LinkifyIt {
    type Validate = (text: string, pos: number, self: LinkifyIt) => number | boolean;

    interface FullRule {
        validate: string | RegExp | Validate;
        normalize?: ((match: Match) => void) | undefined;
    }

    type Rule = string | FullRule;

    interface SchemaRules {
        [schema: string]: Rule;
    }

    interface Options {
        fuzzyLink?: boolean | undefined;
        fuzzyIP?: boolean | undefined;
        fuzzyEmail?: boolean | undefined;
    }

    interface Match {
        index: number;
        lastIndex: number;
        raw: string;
        schema: string;
        text: string;
        url: string;
    }

    interface LinkifyIt {
        // Use overloads to provide contextual typing to `FullRule.normalize`, which is ambiguous with string.normalize
        // This appears unneeded to the unified-signatures lint rule.
        add(schema: string, rule: string): LinkifyIt;
        // tslint:disable-next-line: unified-signatures
        add(schema: string, rule: FullRule | null): LinkifyIt;
        match(text: string): Match[] | null;
        normalize(raw: string): string;
        pretest(text: string): boolean;
        set(options: Options): LinkifyIt;
        test(text: string): boolean;
        testSchemaAt(text: string, schemaName: string, pos: number): number;
        tlds(list: string | string[], keepOld?: boolean): LinkifyIt;
        re: {
            [key: string]: RegExp;
        };
    }
}

export = LinkifyIt;
