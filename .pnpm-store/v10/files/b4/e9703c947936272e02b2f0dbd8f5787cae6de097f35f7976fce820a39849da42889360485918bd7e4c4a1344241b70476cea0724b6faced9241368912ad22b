export interface NearTextArgs {
    autocorrect?: boolean;
    certainty?: number;
    concepts: string[];
    distance?: number;
    moveAwayFrom?: Move;
    moveTo?: Move;
    targetVectors?: string[];
}
export interface Move {
    objects?: MoveObject[];
    concepts?: string[];
    force?: number;
}
export interface MoveObject {
    beacon?: string;
    id?: string;
}
export default class GraphQLNearText {
    private autocorrect?;
    private certainty?;
    private concepts;
    private distance?;
    private moveAwayFrom?;
    private moveTo?;
    private targetVectors?;
    constructor(args: NearTextArgs);
    toString(): string;
    validate(): void;
}
type MoveType = 'moveTo' | 'moveAwayFrom';
export declare function parseMoveObjects(move: MoveType, objects: MoveObject[]): string;
export declare function parseMove(move: MoveType, args: Move): string;
export {};
