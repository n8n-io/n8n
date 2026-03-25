import { Descriptor, PropDescriptor, MethodDescriptor, SlotDescriptor, EventDescriptor, ExposeDescriptor, ComponentDoc, DocBlockTags, BlockTag, Param, UnnamedParam, Tag, ParamTag, ParamType } from 'vue-inbrowser-compiler-independent-utils';
export { Descriptor, PropDescriptor, MethodDescriptor, SlotDescriptor, EventDescriptor, ExposeDescriptor, ComponentDoc, DocBlockTags, BlockTag, Param, UnnamedParam, Tag, ParamTag, ParamType };
export default class Documentation {
    private propsMap;
    private eventsMap;
    private slotsMap;
    private methodsMap;
    private exposedMap;
    private dataMap;
    private docsBlocks;
    private originExtendsMixin;
    readonly sourceFiles: Set<string>;
    readonly componentFullfilePath: string;
    constructor(fullFilePath: string);
    setOrigin(origin: Descriptor): void;
    setDocsBlocks(docsBlocks: string[]): void;
    set(key: string, value: any): void;
    get(key: string): any;
    getPropDescriptor(propName: string): PropDescriptor;
    getEventDescriptor(eventName: string): EventDescriptor;
    getSlotDescriptor(slotName: string): SlotDescriptor;
    getMethodDescriptor(methodName: string): MethodDescriptor;
    getExposeDescriptor(exposedName: string): ExposeDescriptor;
    toObject(): ComponentDoc;
    private getDescriptor;
    private getObjectFromDescriptor;
}
export { Documentation };
