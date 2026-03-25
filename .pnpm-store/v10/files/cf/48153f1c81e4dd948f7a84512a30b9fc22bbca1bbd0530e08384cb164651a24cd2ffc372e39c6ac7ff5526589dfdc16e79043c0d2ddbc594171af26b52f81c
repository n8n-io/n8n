import type { Pop } from "./pop";
type RecursiveSplit<STRING extends string, SEPARATOR extends string = ""> = STRING extends `${infer BEFORE}${SEPARATOR}${infer AFTER}` ? [BEFORE, ...RecursiveSplit<AFTER, SEPARATOR>] : [STRING];
export type Split<STRING extends string, SEPARATOR extends string = "", RESULT extends string[] = RecursiveSplit<STRING, SEPARATOR>> = SEPARATOR extends "" ? Pop<RESULT> : RESULT;
export {};
