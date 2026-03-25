export interface GenericBean<TBeanName, TBeanCollection> {
    /** AG Grid internal - do not use */
    beanName?: TBeanName;
    /** AG Grid internal - do not call */
    wireBeans?(beans: TBeanCollection): void;
    /** AG Grid internal - do not call */
    postConstruct?(): void;
    /** AG Grid internal - do not call */
    destroy?(): void;
}
