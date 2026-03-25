import { namedTypes } from "ast-types";
import { Lines } from "./lines";
declare type Pos = namedTypes.Position;
declare type Loc = namedTypes.SourceLocation;
export default class Mapping {
    sourceLines: Lines;
    sourceLoc: Loc;
    targetLoc: Loc;
    constructor(sourceLines: Lines, sourceLoc: Loc, targetLoc?: Loc);
    slice(lines: Lines, start: Pos, end?: Pos): Mapping | null;
    add(line: number, column: number): Mapping;
    subtract(line: number, column: number): Mapping;
    indent(by: number, skipFirstLine?: boolean, noNegativeColumns?: boolean): Mapping;
}
export {};
