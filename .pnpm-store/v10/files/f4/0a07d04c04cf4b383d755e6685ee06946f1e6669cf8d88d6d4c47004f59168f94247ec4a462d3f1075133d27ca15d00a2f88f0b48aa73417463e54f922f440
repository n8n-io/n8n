export function not<T>(pred: (value: T, index: number) => boolean, thisArg: any): (value: T, index: number) => boolean {
  return (value: T, index: number) => !pred.call(thisArg, value, index); 
}