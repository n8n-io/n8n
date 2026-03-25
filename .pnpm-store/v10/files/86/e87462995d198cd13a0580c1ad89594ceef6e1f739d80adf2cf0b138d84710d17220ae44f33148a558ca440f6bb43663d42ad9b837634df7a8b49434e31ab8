import { IDerivation } from "../internal";
export declare function createAction(actionName: string, fn: Function, autoAction?: boolean, ref?: Object): Function;
export declare function executeAction(actionName: string, canRunAsDerivation: boolean, fn: Function, scope?: any, args?: IArguments): any;
export interface IActionRunInfo {
    prevDerivation_: IDerivation | null;
    prevAllowStateChanges_: boolean;
    prevAllowStateReads_: boolean;
    notifySpy_: boolean;
    startTime_: number;
    error_?: any;
    parentActionId_: number;
    actionId_: number;
    runAsAction_?: boolean;
}
export declare function _startAction(actionName: string, canRunAsDerivation: boolean, // true for autoAction
scope: any, args?: IArguments): IActionRunInfo;
export declare function _endAction(runInfo: IActionRunInfo): void;
export declare function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T;
export declare function allowStateChangesStart(allowStateChanges: boolean): boolean;
export declare function allowStateChangesEnd(prev: boolean): void;
