import type { Ratio } from '../chart/types';
export type AgInterpolationType = AgLineLinearType | AgLineSmoothType | AgLineStepType;
export interface AgLineLinearType {
    type: 'linear';
}
export interface AgLineSmoothType {
    type: 'smooth';
    tension?: Ratio;
}
export interface AgLineStepType {
    type: 'step';
    position?: 'start' | 'middle' | 'end';
}
