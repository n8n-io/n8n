export interface ILocaleService<TKey extends string = string> {
    readonly beanName: 'localeSvc';
    getLocaleTextFunc(): LocaleTextFunc<TKey>;
}
export type LocaleTextFunc<TKey extends string = string> = (key: TKey, defaultValue: string, variableValues?: string[]) => string;
