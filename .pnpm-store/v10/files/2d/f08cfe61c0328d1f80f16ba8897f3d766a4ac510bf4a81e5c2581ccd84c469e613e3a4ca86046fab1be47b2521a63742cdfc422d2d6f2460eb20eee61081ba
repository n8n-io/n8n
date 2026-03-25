import { IComputedDidChange } from "./computedvalue";
import { IValueDidChange, IBoxDidChange } from "./../types/observablevalue";
import { IObjectDidChange } from "./../types/observableobject";
import { IArrayDidChange } from "./../types/observablearray";
import { Lambda, ISetDidChange, IMapDidChange } from "../internal";
export declare function isSpyEnabled(): boolean;
export type PureSpyEvent = {
    type: "action";
    name: string;
    object: unknown;
    arguments: unknown[];
} | {
    type: "scheduled-reaction";
    name: string;
} | {
    type: "reaction";
    name: string;
} | {
    type: "error";
    name: string;
    message: string;
    error: string;
} | IComputedDidChange<unknown> | IObjectDidChange<unknown> | IArrayDidChange<unknown> | IMapDidChange<unknown, unknown> | ISetDidChange<unknown> | IValueDidChange<unknown> | IBoxDidChange<unknown> | {
    type: "report-end";
    spyReportEnd: true;
    time?: number;
};
type SpyEvent = PureSpyEvent & {
    spyReportStart?: true;
};
export declare function spyReport(event: SpyEvent): void;
export declare function spyReportStart(event: PureSpyEvent): void;
export declare function spyReportEnd(change?: {
    time?: number;
}): void;
export declare function spy(listener: (change: SpyEvent) => void): Lambda;
export {};
