import type { Node } from 'estree';

export type RangeNode = Node & { range: [number, number] };
