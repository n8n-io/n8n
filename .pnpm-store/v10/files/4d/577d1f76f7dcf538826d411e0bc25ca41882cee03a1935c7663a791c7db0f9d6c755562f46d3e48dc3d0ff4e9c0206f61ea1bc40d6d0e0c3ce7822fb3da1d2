import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AutoSizeStrategy } from '../interfaces/autoSize';
import type { _ModuleWithoutApi } from '../interfaces/iModule';
type ColumnDelayRenderKey = 'colFlex' | 'columnState' | AutoSizeStrategy['type'];
export declare class ColumnDelayRenderService extends BeanStub implements NamedBean {
    beanName: "colDelayRenderSvc";
    private hideRequested;
    private alreadyRevealed;
    private timesRetried;
    private readonly requesters;
    hideColumns(key: ColumnDelayRenderKey): void;
    revealColumns(key: ColumnDelayRenderKey): void;
}
/**
 * @feature Columns -> Column Sizing
 * @gridOption autoSizeStrategy, colDef.flex, initialState
 */
export declare const ColumnDelayRenderModule: _ModuleWithoutApi;
export {};
