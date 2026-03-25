import * as styledComponents from 'styled-components';

// FIXME
declare module 'styled-components' {
  interface ThemedStyledComponentsModule<T> {
    keyframes(
      strings: TemplateStringsArray | string[],
      ...interpolations: SimpleInterpolation[]
    ): Keyframes;
  }

  export interface BaseThemedCssFunction<T extends object> {
    <P extends object>(
      first:
        | TemplateStringsArray
        | CSSObject
        | InterpolationFunction<ThemedStyledProps<P, T>>
        | string[],
      ...interpolations: Array<Interpolation<ThemedStyledProps<P, T>>>
    ): FlattenInterpolation<ThemedStyledProps<P, T>>;
  }
}
