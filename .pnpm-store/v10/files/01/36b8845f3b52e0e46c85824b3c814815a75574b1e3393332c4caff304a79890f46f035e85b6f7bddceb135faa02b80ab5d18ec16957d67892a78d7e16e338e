import { NearMediaBase } from './nearMedia.js';
export interface NearImageArgs extends NearMediaBase {
    image?: string;
    targetVectors?: string[];
}
export default class GraphQLNearImage {
    private certainty?;
    private distance?;
    private image?;
    private targetVectors?;
    constructor(args: NearImageArgs);
    toString(wrap?: boolean): string;
    validate(): void;
}
