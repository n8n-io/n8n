import { IsAny } from "./is-any";
import { NonRecursiveType } from "./non-recursive-type";
export type HasParsablePath<Type> = Type extends NonRecursiveType
  ? false
  : IsAny<Type> extends true
  ? false
  : Type extends object
  ? true
  : false;
