import { Readable, Writable } from 'node:stream';

declare const actions: readonly ["up", "down", "left", "right", "space", "enter", "cancel"];
type Action = (typeof actions)[number];
interface ClackSettings {
    /**
     * Set custom global aliases for the default actions.
     * This will not overwrite existing aliases, it will only add new ones!
     *
     * @param aliases - An object that maps aliases to actions
     * @default { k: 'up', j: 'down', h: 'left', l: 'right', '\x03': 'cancel', 'escape': 'cancel' }
     */
    aliases: Record<string, Action>;
}
declare function updateSettings(updates: ClackSettings): void;

/**
 * The state of the prompt
 */
type ClackState = 'initial' | 'active' | 'cancel' | 'submit' | 'error';
/**
 * Typed event emitter for clack
 */
interface ClackEvents {
    initial: (value?: any) => void;
    active: (value?: any) => void;
    cancel: (value?: any) => void;
    submit: (value?: any) => void;
    error: (value?: any) => void;
    cursor: (key?: Action) => void;
    key: (key?: string) => void;
    value: (value?: string) => void;
    confirm: (value?: boolean) => void;
    finalize: () => void;
}

interface PromptOptions<Self extends Prompt> {
    render(this: Omit<Self, 'prompt'>): string | undefined;
    placeholder?: string;
    initialValue?: any;
    validate?: ((value: any) => string | Error | undefined) | undefined;
    input?: Readable;
    output?: Writable;
    debug?: boolean;
    signal?: AbortSignal;
}
declare class Prompt {
    protected input: Readable;
    protected output: Writable;
    private _abortSignal?;
    private rl;
    private opts;
    private _render;
    private _track;
    private _prevFrame;
    private _subscribers;
    protected _cursor: number;
    state: ClackState;
    error: string;
    value: any;
    constructor(options: PromptOptions<Prompt>, trackValue?: boolean);
    /**
     * Unsubscribe all listeners
     */
    protected unsubscribe(): void;
    /**
     * Set a subscriber with opts
     * @param event - The event name
     */
    private setSubscriber;
    /**
     * Subscribe to an event
     * @param event - The event name
     * @param cb - The callback
     */
    on<T extends keyof ClackEvents>(event: T, cb: ClackEvents[T]): void;
    /**
     * Subscribe to an event once
     * @param event - The event name
     * @param cb - The callback
     */
    once<T extends keyof ClackEvents>(event: T, cb: ClackEvents[T]): void;
    /**
     * Emit an event with data
     * @param event - The event name
     * @param data - The data to pass to the callback
     */
    emit<T extends keyof ClackEvents>(event: T, ...data: Parameters<ClackEvents[T]>): void;
    prompt(): Promise<string | symbol>;
    private onKeypress;
    protected close(): void;
    private restoreCursor;
    private render;
}

interface ConfirmOptions extends PromptOptions<ConfirmPrompt> {
    active: string;
    inactive: string;
    initialValue?: boolean;
}
declare class ConfirmPrompt extends Prompt {
    get cursor(): 0 | 1;
    private get _value();
    constructor(opts: ConfirmOptions);
}

interface GroupMultiSelectOptions<T extends {
    value: any;
}> extends PromptOptions<GroupMultiSelectPrompt<T>> {
    options: Record<string, T[]>;
    initialValues?: T['value'][];
    required?: boolean;
    cursorAt?: T['value'];
    selectableGroups?: boolean;
}
declare class GroupMultiSelectPrompt<T extends {
    value: any;
}> extends Prompt {
    #private;
    options: (T & {
        group: string | boolean;
    })[];
    cursor: number;
    getGroupItems(group: string): T[];
    isGroupSelected(group: string): boolean;
    private toggleValue;
    constructor(opts: GroupMultiSelectOptions<T>);
}

interface MultiSelectOptions<T extends {
    value: any;
}> extends PromptOptions<MultiSelectPrompt<T>> {
    options: T[];
    initialValues?: T['value'][];
    required?: boolean;
    cursorAt?: T['value'];
}
declare class MultiSelectPrompt<T extends {
    value: any;
}> extends Prompt {
    options: T[];
    cursor: number;
    private get _value();
    private toggleAll;
    private toggleValue;
    constructor(opts: MultiSelectOptions<T>);
}

interface PasswordOptions extends PromptOptions<PasswordPrompt> {
    mask?: string;
}
declare class PasswordPrompt extends Prompt {
    valueWithCursor: string;
    private _mask;
    get cursor(): number;
    get masked(): any;
    constructor({ mask, ...opts }: PasswordOptions);
}

interface SelectOptions<T extends {
    value: any;
}> extends PromptOptions<SelectPrompt<T>> {
    options: T[];
    initialValue?: T['value'];
}
declare class SelectPrompt<T extends {
    value: any;
}> extends Prompt {
    options: T[];
    cursor: number;
    private get _value();
    private changeValue;
    constructor(opts: SelectOptions<T>);
}

interface SelectKeyOptions<T extends {
    value: any;
}> extends PromptOptions<SelectKeyPrompt<T>> {
    options: T[];
}
declare class SelectKeyPrompt<T extends {
    value: any;
}> extends Prompt {
    options: T[];
    cursor: number;
    constructor(opts: SelectKeyOptions<T>);
}

interface TextOptions extends PromptOptions<TextPrompt> {
    placeholder?: string;
    defaultValue?: string;
}
declare class TextPrompt extends Prompt {
    get valueWithCursor(): any;
    get cursor(): number;
    constructor(opts: TextOptions);
}

declare function isCancel(value: unknown): value is symbol;
declare function block({ input, output, overwrite, hideCursor, }?: {
    input?: (NodeJS.ReadStream & {
        fd: 0;
    }) | undefined;
    output?: (NodeJS.WriteStream & {
        fd: 1;
    }) | undefined;
    overwrite?: boolean | undefined;
    hideCursor?: boolean | undefined;
}): () => void;

export { type ClackSettings, ConfirmPrompt, GroupMultiSelectPrompt, MultiSelectPrompt, PasswordPrompt, Prompt, SelectKeyPrompt, SelectPrompt, type ClackState as State, TextPrompt, block, isCancel, updateSettings };
