export type RunFunction = () => Promise<unknown>;
export type Queue<Element, Options> = {
    size: number;
    filter: (options: Readonly<Partial<Options>>) => Element[];
    dequeue: () => Element | undefined;
    enqueue: (run: Element, options?: Partial<Options>) => void;
    setPriority: (id: string, priority: number) => void;
};
