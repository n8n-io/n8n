import { type Instance } from '../../setup';
import { EventType } from '../types';
export interface BehaviorPlugin<Type extends EventType> {
    (event: DocumentEventMap[Type], target: Element, instance: Instance): // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    void | (() => void);
}
export declare const behavior: {
    [Type in EventType]?: BehaviorPlugin<Type>;
};
