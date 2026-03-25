declare module 'cluster-key-slot' {
  // Convert a string or Buffer into a redis slot hash.
  function calculate(value: string | Buffer): number;

  // Convert an array of multiple strings or Buffers into a redis slot hash.
  // Returns -1 if one of the keys is not for the same slot as the others
  export function generateMulti(values: Array<string | Buffer>): number;
  
  export = calculate;
}