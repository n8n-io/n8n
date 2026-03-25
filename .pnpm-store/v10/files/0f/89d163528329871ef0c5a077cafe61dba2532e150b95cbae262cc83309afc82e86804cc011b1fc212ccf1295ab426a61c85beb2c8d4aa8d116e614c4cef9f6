export type StyleTuple = [string, string]

export interface Style {
  [key: string]: string | number | Style
}

export function getPropertyName(name: string): string
export function getStylesForProperty(
  name: string,
  value: string,
  allowShorthand?: boolean
): Style

export default function transform(
  styleTuples: StyleTuple[],
  shorthandBlacklist?: string[]
): Style
