import type { AnyObject } from '../types/basic.js';
import type { Point } from '../types/geometric.js';
import type { Animation } from '../types/animation.js';
export default class Element<T = AnyObject, O = AnyObject> {
    static defaults: {};
    static defaultRoutes: any;
    x: number;
    y: number;
    active: boolean;
    options: O;
    $animations: Record<keyof T, Animation>;
    tooltipPosition(useFinalPosition: boolean): Point;
    hasValue(): boolean;
    /**
     * Gets the current or final value of each prop. Can return extra properties (whole object).
     * @param props - properties to get
     * @param [final] - get the final value (animation target)
     */
    getProps<P extends (keyof T)[]>(props: P, final?: boolean): Pick<T, P[number]>;
    getProps<P extends string>(props: P[], final?: boolean): Partial<Record<P, unknown>>;
}
