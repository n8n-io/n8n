export declare type RunFunction = () => Promise<unknown>;
export interface Queue<Element, Options> {
    size: number;
    filter: (options: Partial<Options>) => Element[];
    dequeue: () => Element | undefined;
    enqueue: (run: Element, options?: Partial<Options>) => void;
}
