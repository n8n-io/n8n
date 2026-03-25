/// <reference types="react" />
export interface IObserverOptions {
    readonly forwardRef?: boolean;
}
export declare function observer<P extends object, TRef = {}>(baseComponent: React.ForwardRefRenderFunction<TRef, P>, options: IObserverOptions & {
    forwardRef: true;
}): React.MemoExoticComponent<React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>>;
export declare function observer<P extends object, TRef = {}>(baseComponent: React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>): React.MemoExoticComponent<React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>>;
export declare function observer<P extends object>(baseComponent: React.FunctionComponent<P>, options?: IObserverOptions): React.FunctionComponent<P>;
export declare function observer<C extends React.FunctionComponent<any> | React.ForwardRefRenderFunction<any>, Options extends IObserverOptions>(baseComponent: C, options?: Options): Options extends {
    forwardRef: true;
} ? C extends React.ForwardRefRenderFunction<infer TRef, infer P> ? C & React.MemoExoticComponent<React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>> : never : C & {
    displayName: string;
};
