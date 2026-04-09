/**
 * @deprecated Observer options will be removed in the next major version of mobx-react-lite.
 * Look at the individual properties for alternatives.
 */
export interface IObserverOptions {
    /**
     * @deprecated Pass a `React.forwardRef` component to observer instead of using the options object
     * e.g. `observer(React.forwardRef(fn))`
     */
    readonly forwardRef?: boolean;
}
export declare function observer<P extends object, TRef = {}>(baseComponent: React.ForwardRefRenderFunction<TRef, P>, options: IObserverOptions & {
    /**
     * @deprecated Pass a `React.forwardRef` component to observer instead of using the options object
     * e.g. `observer(React.forwardRef(fn))`
     */
    forwardRef: true;
}): React.MemoExoticComponent<React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>>;
export declare function observer<P extends object>(baseComponent: React.FunctionComponent<P>, options?: IObserverOptions): React.FunctionComponent<P>;
export declare function observer<P extends object, TRef = {}>(baseComponent: React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>): React.MemoExoticComponent<React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>>;
export declare function observer<C extends React.FunctionComponent<any> | React.ForwardRefRenderFunction<any>, Options extends IObserverOptions>(baseComponent: C, options?: Options): Options extends {
    forwardRef: true;
} ? C extends React.ForwardRefRenderFunction<infer TRef, infer P> ? C & React.MemoExoticComponent<React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>> : never : C & {
    displayName: string;
};
