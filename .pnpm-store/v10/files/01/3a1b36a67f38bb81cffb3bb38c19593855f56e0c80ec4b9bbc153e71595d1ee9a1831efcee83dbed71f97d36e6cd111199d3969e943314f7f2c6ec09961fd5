/** IDs match grid error IDs */
type ThemeErrorMap = {
    104: ({ value, param, }: {
        value: any;
        param: string;
    }) => `Numeric value ${number} passed to ${string} param will be interpreted as ${number} seconds. If this is intentional use "${number}s" to silence this warning.`;
    107: ({ key, value }: {
        key: string;
        value: unknown;
    }) => `Invalid value for theme param ${string} - ${string}`;
    259: ({ part, }: {
        part: any;
    }) => `the argument to theme.withPart must be a Theming API part object, received: ${any}`;
};
type ThemeErrorId = keyof ThemeErrorMap;
type ThemeErrorValue<TId extends ThemeErrorId | null> = TId extends ThemeErrorId ? ThemeErrorMap[TId] : never;
type GetThemeErrorParams<TId extends ThemeErrorId> = ThemeErrorValue<TId> extends (params: infer P) => any ? (P extends Record<string, any> ? P : undefined) : never;
export type ThemeLogger = {
    error: <TId extends ThemeErrorId, TShowMessageAtCallLocation = ThemeErrorMap[TId]>(...args: undefined extends GetThemeErrorParams<TId> ? [id: TId] : [id: TId, params: GetThemeErrorParams<TId>]) => void;
    warn: <TId extends ThemeErrorId, TShowMessageAtCallLocation = ThemeErrorMap[TId]>(...args: undefined extends GetThemeErrorParams<TId> ? [id: TId] : [id: TId, params: GetThemeErrorParams<TId>]) => void;
    preInitErr: <TId extends ThemeErrorId, TShowMessageAtCallLocation = ThemeErrorMap[TId]>(...args: undefined extends GetThemeErrorParams<TId> ? [id: TId, defaultMessage: string] : [id: TId, defaultMessage: string, params: GetThemeErrorParams<TId>]) => void;
};
export {};
