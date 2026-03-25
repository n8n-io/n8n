import { ContainerIterator } from "../../ContainerBase";
import SequentialContainer from "./index";
export declare abstract class RandomIterator<T> extends ContainerIterator<T> {
    abstract readonly container: SequentialContainer<T>;
    get pointer(): T;
    set pointer(newValue: T);
    pre(): this;
    next(): this;
}
